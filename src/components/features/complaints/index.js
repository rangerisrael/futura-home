'use client';
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import ReactSelect from "react-select";
import { Plus, Search, AlertTriangle, Building2, User, X, Edit, Trash2, AlertTriangle as AlertTriangleIcon, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { formattedDate, isNewItem, getRelativeTime } from "@/lib/utils";

// Initialize Supabase client
const supabase = createClientComponentClient();

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [properties, setProperties] = useState([]);
  const [homeowners, setHomeowners] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [deletingComplaint, setDeletingComplaint] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    complaint_type: '',
    severity: 'medium',
    status: 'pending',
    homeowner_id: '',
    property_id: '',
    created_date: new Date().toISOString()
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterComplaints();
  }, [complaints, searchTerm, statusFilter, severityFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch complaints with related data
      const { data: complaintsData, error: complaintsError } = await supabase
        .from('complaint_tbl')
        .select(`
          *,
          homeowner_tbl:homeowner_id(*),
          properties:property_id(*)
        `)
        .order('created_date', { ascending: false });

      if (complaintsError) throw complaintsError;

      // Fetch properties for dropdown
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .order('name');

      if (propertiesError) throw propertiesError;

      // Load homeowners who have contracts only
      const homeownersResponse = await fetch("/api/homeowners/with-contracts");
      const homeownersResult = await homeownersResponse.json();

      const homeownersData = homeownersResult.success ? homeownersResult.data : [];

      console.log("✅ Loaded homeowners with contracts:", homeownersData.length);

      setComplaints(complaintsData || []);
      setProperties(propertiesData || []);
      setHomeowners(homeownersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterComplaints = async () => {
    try {
      let query = supabase
        .from('complaint_tbl')
        .select(`
          *,
          homeowner:homeowner_id(*),
          property:property_id(*)
        `)
        .order('created_date', { ascending: false });

      // Apply filters
      if (searchTerm) {
        query = query.ilike('subject', `%${searchTerm}%`);
      }
      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }
      if (severityFilter !== "all") {
        query = query.eq('severity', severityFilter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      setFilteredComplaints(data || []);
    } catch (error) {
      console.error('Error filtering complaints:', error);
      // Fallback to client-side filtering if needed
      let filtered = complaints;
      if (searchTerm) {
        filtered = filtered.filter(c => c.subject.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      if (statusFilter !== "all") {
        filtered = filtered.filter(c => c.status === statusFilter);
      }
      if (severityFilter !== "all") {
        filtered = filtered.filter(c => c.severity === severityFilter);
      }
      setFilteredComplaints(filtered);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleHomeownerChange = (selectedOption) => {
    if (!selectedOption) {
      setFormData(prev => ({ ...prev, homeowner_id: '', property_id: '' }));
      return;
    }

    // Clear property_id when homeowner changes so user must select property
    setFormData(prev => ({
      ...prev,
      homeowner_id: selectedOption.value,
      property_id: '' // Reset property when homeowner changes
    }));
  };

  // Handle opening edit modal
  const handleEditComplaint = (complaint) => {
    setEditingComplaint(complaint);
    setFormData({
      subject: complaint.subject,
      description: complaint.description,
      complaint_type: complaint.complaint_type,
      severity: complaint.severity,
      status: complaint.status,
      homeowner_id: complaint.homeowner_id?.toString() || '',
      property_id: complaint.property_id?.toString() || '',
      created_date: complaint.created_date
    });
    setIsEditModalOpen(true);
  };

  // Handle opening delete modal
  const handleDeleteComplaint = (complaint) => {
    setDeletingComplaint(complaint);
    setIsDeleteModalOpen(true);
  };

  // Handle confirming delete
  const handleConfirmDelete = async () => {
    if (!deletingComplaint) return;

    setFormSubmitting(true);
    try {
      await deleteComplaint(deletingComplaint.id, deletingComplaint.subject);
      toast.success('Complaint deleted successfully!');
      setIsDeleteModalOpen(false);
      setDeletingComplaint(null);
    } catch (error) {
      console.error('Error deleting complaint:', error);
      toast.info('Error deleting complaint: ' + error.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Update complaint function
  const updateComplaint = async (complaintId, updateData) => {
    try {
      const { data, error } = await supabase
        .from('complaint_tbl')
        .update(updateData)
        .eq('id', complaintId)
        .select(`
          *,
          homeowner_tbl:homeowner_id(*),
          properties:property_id(*)
        `)
        .single();

      if (error) throw error;

      // Update local state
      setComplaints(prev => 
        prev.map(complaint => 
          complaint.id === complaintId 
            ? { ...complaint, ...data }
            : complaint
        )
      );

      return data;
    } catch (error) {
      console.error('Error updating complaint:', error);
      throw error;
    }
  };

  // Delete complaint function
  const deleteComplaint = async (complaintId, complaintSubject) => {
    try {
      const { error } = await supabase
        .from('complaint_tbl')
        .delete()
        .eq('id', complaintId);

      if (error) throw error;

      // Remove from local state
      setComplaints(prev => prev.filter(complaint => complaint.id !== complaintId));
      
      return true;
    } catch (error) {
      console.error('Error deleting complaint:', error);
      throw error;
    }
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      subject: '',
      description: '',
      complaint_type: '',
      severity: 'medium',
      status: 'pending',
      homeowner_id: '',
      property_id: '',
      created_date: new Date().toISOString()
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);

    try {
      if (editingComplaint) {
        // Update existing complaint
        const updateData = {
          subject: formData.subject,
          description: formData.description,
          complaint_type: formData.complaint_type,
          severity: formData.severity,
          status: formData.status,
          homeowner_id: parseInt(formData.homeowner_id),
          property_id: parseInt(formData.property_id)
        };
        
        const data = await updateComplaint(editingComplaint.id, updateData);
        toast.success('Complaint updated successfully!');
        setIsEditModalOpen(false);
        setEditingComplaint(null);
      } else {
        // Insert new complaint into Supabase
        const { data, error } = await supabase
          .from('complaint_tbl')
          .insert([{
            subject: formData.subject,
            description: formData.description,
            complaint_type: formData.complaint_type,
            severity: formData.severity,
            status: formData.status,
            homeowner_id: parseInt(formData.homeowner_id),
            property_id: parseInt(formData.property_id),
            created_date: new Date().toISOString()
          }])
          .select();

        if (error) throw error;

        setIsModalOpen(false);
        
        // Reload data to show new complaint
        await loadData();
        
        toast.success('Complaint filed successfully!');
      }

      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error submitting complaint:', error);
      toast.error('Error filing complaint. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const getPropertyName = (complaint) => {
    return complaint.property?.name || 'N/A';
  };
  
  const getHomeownerName = (complaint) => {
    return complaint.homeowner?.full_name || 'N/A';
  };
  
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      investigating: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      escalated: 'bg-red-100 text-red-800',
      in_progress: 'bg-indigo-100 text-indigo-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };
  
  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-500 text-white',
      high: 'bg-orange-400 text-white',
      medium: 'bg-yellow-400 text-yellow-900',
      low: 'bg-green-400 text-green-900',
    };
    return colors[severity] || 'bg-gray-400 text-white';
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Complaints</h1>
            <p className="text-lg text-slate-600">Address and resolve homeowner complaints</p>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-red-400 to-red-500 text-white shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" /> File Complaint
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-lg">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input placeholder="Search complaints..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/>
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          {loading ? ( 
            <div className="text-center py-12">Loading complaints...</div> 
          ) : filteredComplaints.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Complaints Found</h3>
              <p className="text-slate-600">No complaints match the current filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredComplaints.map((complaint, index) => (
                <motion.div key={complaint.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card className="bg-white/80 backdrop-blur-sm border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 hover:-translate-y-1">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <CardTitle className="text-lg text-slate-900 line-clamp-1">{complaint.subject}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getStatusColor(complaint.status)} border capitalize`}>{complaint.status}</Badge>
                          {isNewItem(complaint.created_date) && (
                            <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-md animate-pulse">
                              <Sparkles className="w-3 h-3 mr-1" />
                              New
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`${getSeverityColor(complaint.severity)} capitalize`}>{complaint.severity}</Badge>
                        <Badge variant="outline" className="capitalize">{complaint.complaint_type}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-slate-700 text-sm line-clamp-3">{complaint.description}</p>
                      <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <User className="w-4 h-4" />
                          <span>Filed by: {getHomeownerName(complaint)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Building2 className="w-4 h-4" />
                          <span>Property: {getPropertyName(complaint)}</span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 pt-3 border-t border-slate-200">
                        Filed on {formattedDate(new Date(complaint.created_date), "MMM d, yyyy, p")}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-3 mt-3 border-t border-slate-200">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => handleEditComplaint(complaint)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleDeleteComplaint(complaint)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Create Complaint Modal */}
      {isModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-6 text-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">File New Complaint</h3>
                    <p className="text-red-100 text-sm mt-1">Submit a new homeowner complaint</p>
                  </div>
                </div>
                <button
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formSubmitting}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="Enter complaint subject"
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Complaint Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="complaint_type"
                      value={formData.complaint_type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                      required
                    >
                      <option value="">Select type</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="noise">Noise</option>
                      <option value="parking">Parking</option>
                      <option value="security">Security</option>
                      <option value="billing">Billing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe the complaint in detail..."
                    rows="4"
                    className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="homeowner" className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      Homeowner <span className="text-red-500">*</span>
                    </Label>
                    <ReactSelect
                      className="mt-2"
                      options={homeowners.map(homeowner => ({
                        value: homeowner.id,
                        label: `${homeowner.full_name} (${homeowner.email})`
                      }))}
                      value={
                        formData.homeowner_id
                          ? {
                              value: formData.homeowner_id,
                              label: homeowners.find(h => h.id === formData.homeowner_id)
                                ? `${homeowners.find(h => h.id === formData.homeowner_id).full_name} (${homeowners.find(h => h.id === formData.homeowner_id).email})`
                                : 'Select homeowner'
                            }
                          : null
                      }
                      onChange={handleHomeownerChange}
                      placeholder="Search and select a homeowner..."
                      isClearable
                      isSearchable
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '44px',
                          borderRadius: '0.75rem',
                          borderColor: '#cbd5e1',
                          backgroundColor: '#f8fafc'
                        })
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="property" className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      Property <span className="text-red-500">*</span>
                    </Label>
                    {formData.homeowner_id ? (
                      <ReactSelect
                        className="mt-2"
                        options={
                          homeowners
                            .find((h) => h.id === formData.homeowner_id)
                            ?.properties?.map((property) => ({
                              value: property.property_id,
                              label: property.property_title,
                            })) || []
                        }
                        value={
                          formData.property_id
                            ? {
                                value: formData.property_id,
                                label:
                                  homeowners
                                    .find((h) => h.id === formData.homeowner_id)
                                    ?.properties?.find(
                                      (p) => p.property_id === formData.property_id
                                    )?.property_title || "Select property",
                              }
                            : null
                        }
                        onChange={(selectedOption) =>
                          handleInputChange({
                            target: {
                              name: "property_id",
                              value: selectedOption ? selectedOption.value : "",
                            },
                          })
                        }
                        placeholder="Select homeowner's property..."
                        isClearable
                        isSearchable
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: "44px",
                            borderRadius: "0.75rem",
                            borderColor: "#cbd5e1",
                          }),
                        }}
                      />
                    ) : (
                      <Input
                        type="text"
                        className="mt-2 h-11 bg-slate-50 border-slate-300 cursor-not-allowed rounded-xl"
                        value=""
                        placeholder="Select homeowner first"
                        readOnly
                        disabled
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Severity
                    </label>
                    <select
                      name="severity"
                      value={formData.severity}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                      <option value="pending">Pending</option>
                      <option value="investigating">Investigating</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                      <option value="escalated">Escalated</option>
                    </select>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                    disabled={formSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-red-500/30 ${
                      formSubmitting ? 'opacity-80 cursor-not-allowed' : ''
                    }`}
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5" />
                        File Complaint
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Edit Complaint Modal */}
      {isEditModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEditModalOpen(false);
              setEditingComplaint(null);
              resetForm();
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-6 text-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Edit className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Edit Complaint</h3>
                    <p className="text-blue-100 text-sm mt-1">Update complaint information</p>
                  </div>
                </div>
                <button
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingComplaint(null);
                    resetForm();
                  }}
                  disabled={formSubmitting}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="Enter complaint subject"
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Complaint Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="complaint_type"
                      value={formData.complaint_type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                      required
                    >
                      <option value="">Select type</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="noise">Noise</option>
                      <option value="parking">Parking</option>
                      <option value="security">Security</option>
                      <option value="billing">Billing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe the complaint in detail..."
                    rows="4"
                    className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit-homeowner" className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      Homeowner <span className="text-red-500">*</span>
                    </Label>
                    <ReactSelect
                      className="mt-2"
                      options={homeowners.map(homeowner => ({
                        value: homeowner.id.toString(),
                        label: `${homeowner.full_name} - Unit ${homeowner.unit_number}${
                          homeowner.property_info_tbl
                            ? ` (${homeowner.property_info_tbl.property_title})`
                            : ''
                        }`
                      }))}
                      value={
                        formData.homeowner_id
                          ? {
                              value: formData.homeowner_id,
                              label: homeowners.find(h => h.id.toString() === formData.homeowner_id)
                                ? `${homeowners.find(h => h.id.toString() === formData.homeowner_id).full_name} - Unit ${
                                    homeowners.find(h => h.id.toString() === formData.homeowner_id).unit_number
                                  }${
                                    homeowners.find(h => h.id.toString() === formData.homeowner_id).property_info_tbl
                                      ? ` (${homeowners.find(h => h.id.toString() === formData.homeowner_id).property_info_tbl.property_title})`
                                      : ''
                                  }`
                                : 'Select homeowner'
                            }
                          : null
                      }
                      onChange={handleHomeownerChange}
                      placeholder="Search and select a homeowner..."
                      isClearable
                      isSearchable
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '44px',
                          borderRadius: '0.75rem',
                          borderColor: '#cbd5e1',
                          backgroundColor: '#f8fafc'
                        })
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-property" className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      Property <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      className="mt-2 h-11 bg-slate-50 border-slate-300 cursor-not-allowed rounded-xl"
                      value={
                        formData.property_id && homeowners.find(h => h.id.toString() === formData.homeowner_id)?.property_info_tbl
                          ? homeowners.find(h => h.id.toString() === formData.homeowner_id).property_info_tbl.property_title
                          : ''
                      }
                      placeholder="Select homeowner first"
                      readOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Severity
                    </label>
                    <select
                      name="severity"
                      value={formData.severity}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                      <option value="pending">Pending</option>
                      <option value="investigating">Investigating</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                      <option value="escalated">Escalated</option>
                    </select>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingComplaint(null);
                      resetForm();
                    }}
                    className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                    disabled={formSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-500/30 ${
                      formSubmitting ? 'opacity-80 cursor-not-allowed' : ''
                    }`}
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Edit className="w-5 h-5" />
                        Update Complaint
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setIsDeleteModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 text-white rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <AlertTriangleIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Delete Complaint</h3>
                    <p className="text-red-100 text-sm mt-1">This action cannot be undone</p>
                  </div>
                </div>
                <button 
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingComplaint(null);
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">
                  Are you sure you want to delete this complaint?
                </h4>
                {deletingComplaint && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-4 text-left">
                    <h5 className="font-medium text-slate-900 mb-1">{deletingComplaint.subject}</h5>
                    <p className="text-sm text-slate-600 mb-2">{deletingComplaint.description}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="capitalize">{deletingComplaint.complaint_type}</span>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded capitalize ${getSeverityColor(deletingComplaint.severity)}`}>
                          {deletingComplaint.severity}
                        </span>
                        <span className={`px-2 py-1 rounded capitalize ${getStatusColor(deletingComplaint.status)}`}>
                          {deletingComplaint.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      <p>Filed by: {getHomeownerName(deletingComplaint)}</p>
                      <p>Property: {getPropertyName(deletingComplaint)}</p>
                    </div>
                  </div>
                )}
                <p className="text-slate-600">
                  This will permanently delete the complaint and all associated data. This action cannot be reversed.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingComplaint(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    formSubmitting ? 'opacity-80 cursor-not-allowed' : ''
                  }`}
                  onClick={handleConfirmDelete}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Complaint
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}