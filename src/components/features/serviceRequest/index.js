"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ReactSelect from "react-select";
import {
  Plus,
  Search,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Wrench,
  Building2,
  User,
  Calendar,
  X,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
  Sparkles,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import { isNewItem, getRelativeTime } from "@/lib/utils";
import { format } from "date-fns";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { formattedDate } from "@/lib/utils";

export default function ServiceRequests() {
  const [requests, setRequests] = useState([]);
  const [properties, setProperties] = useState([]);
  const [homeowners, setHomeowners] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [deletingRequest, setDeletingRequest] = useState(null);

  const supabase = createClientComponentClient();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    request_type: "",
    priority: "medium",
    status: "pending",
    homeowner_id: "",
    property_id: "",
    scheduled_date: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter, priorityFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load service requests with related data
      const { data: requestsData, error: requestsError } = await supabase
        .from("request_tbl")
        .select(
          `
          *,
          homeowner:homeowner_id(id, full_name),
          property:property_id(id, name)
        `
        )
        .order("created_date", { ascending: false });

      if (requestsError) throw requestsError;

      // Load properties for form dropdown
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("property_tbl")
        .select("id, name")
        .order("name");

      if (propertiesError) throw propertiesError;

      // Load homeowners who have contracts only
      const homeownersResponse = await fetch("/api/homeowners/with-contracts");
      const homeownersResult = await homeownersResponse.json();

      const homeownersData = homeownersResult.success ? homeownersResult.data : [];

      console.log("✅ Loaded homeowners with contracts:", homeownersData.length);

      setRequests(requestsData || []);
      setProperties(propertiesData || []);
      setHomeowners(homeownersData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    if (searchTerm) {
      filtered = filtered.filter(
        (request) =>
          request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          request.description
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (request.homeowner?.full_name &&
            request.homeowner.full_name
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (request.property?.name &&
            request.property.name
              .toLowerCase()
              .includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((request) => request.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter(
        (request) => request.priority === priorityFilter
      );
    }

    setFilteredRequests(filtered);
  };

  const getPropertyName = (propertyId) => {
    const property = properties.find((p) => p.id === propertyId);
    return property ? property.name : "N/A";
  };

  const getHomeownerName = (homeownerId) => {
    const homeowner = homeowners.find((h) => h.id === homeownerId);
    return homeowner ? homeowner.full_name : "N/A";
  };

  const getStatusProps = (status) => {
    switch (status) {
      case "pending":
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: Clock,
        };
      case "in_progress":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: AlertCircle,
        };
      case "completed":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: CheckCircle,
        };
      case "cancelled":
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: XCircle,
        };
      case "on_hold":
        return {
          color: "bg-orange-100 text-orange-800 border-orange-200",
          icon: Clock,
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: Clock,
        };
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleHomeownerChange = (selectedOption) => {
    if (!selectedOption) {
      setFormData((prev) => ({ ...prev, homeowner_id: "", property_id: "" }));
      return;
    }

    // Clear property_id when homeowner changes so user must select property
    setFormData((prev) => ({
      ...prev,
      homeowner_id: selectedOption.value,
      property_id: "", // Reset property when homeowner changes
    }));
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      request_type: "",
      priority: "medium",
      status: "pending",
      homeowner_id: "",
      property_id: "",
      scheduled_date: "",
    });
  };

  // Handle opening edit modal
  const handleEditRequest = (request) => {
    setEditingRequest(request);
    setFormData({
      title: request.title,
      description: request.description,
      request_type: request.request_type,
      priority: request.priority,
      status: request.status,
      homeowner_id: request.homeowner_id?.toString() || "",
      property_id: request.property_id?.toString() || "",
      scheduled_date: request.scheduled_date
        ? request.scheduled_date.split("T")[0]
        : "",
    });
    setIsEditModalOpen(true);
  };

  // Handle opening delete modal
  const handleDeleteRequest = (request) => {
    setDeletingRequest(request);
    setIsDeleteModalOpen(true);
  };

  // Handle confirming delete
  const handleConfirmDelete = async () => {
    if (!deletingRequest) return;

    setSubmitting(true);
    try {
      await deleteRequest(deletingRequest.id, deletingRequest.title);
      toast.info("Service request deleted successfully!");
      setIsDeleteModalOpen(false);
      setDeletingRequest(null);
    } catch (error) {
      console.error("Error deleting service request:", error);
      toast.info("Error deleting service request: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Update service request function
  const updateRequest = async (requestId, updateData) => {
    try {
      const { data, error } = await supabase
        .from("request_tbl")
        .update({
          ...updateData,
        })
        .eq("id", requestId)
        .select(
          `
          *,
          homeowner:homeowner_id(id, full_name),
          property:property_id(id, name)
        `
        )
        .single();

      if (error) throw error;

      // Update local state
      setRequests((prev) =>
        prev.map((request) =>
          request.id === requestId ? { ...request, ...data } : request
        )
      );

      return data;
    } catch (error) {
      console.error("Error updating service request:", error);
      throw error;
    }
  };

  // Delete service request function
  const deleteRequest = async (requestId, requestTitle) => {
    try {
      const { error } = await supabase
        .from("request_tbl")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      // Remove from local state
      setRequests((prev) => prev.filter((request) => request.id !== requestId));

      return true;
    } catch (error) {
      console.error("Error deleting service request:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const submitData = {
        ...formData,
        scheduled_date: formData.scheduled_date || null,
      };

      if (editingRequest) {
        // Update existing request
        const data = await updateRequest(editingRequest.id, submitData);
        toast.info("Service request updated successfully!");
        setIsEditModalOpen(false);
        setEditingRequest(null);
      } else {
        // Create new request
        submitData.created_date = new Date().toISOString();

        const { data, error } = await supabase
          .from("request_tbl")
          .insert([submitData]).select(`
            *,
            homeowner:homeowner_id(id, full_name),
            property:property_id(id, name)
          `);

        if (error) throw error;

        // Add new request to the list
        setRequests((prev) => [data[0], ...prev]);

        // Close modal and reset form
        setIsModalOpen(false);

        console.log("Service request created successfully");
      }

      resetForm();
    } catch (error) {
      console.error("Error creating service request:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg shadow-red-500/30">
                <Wrench className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-1">
                  Service Requests
                </h1>
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Track and manage homeowner requests
                </p>
              </div>
            </div>
            <Button
              onClick={openModal}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:from-red-600 hover:to-red-700 transition-all duration-300 rounded-xl px-6"
            >
              <Plus className="w-5 h-5 mr-2" /> New Request
            </Button>
          </div>
        </motion.div>

        {/* Search and Filters Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm"
        >
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search by title, description, homeowner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-11 border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-44 h-11 rounded-xl border-slate-200">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-44 h-11 rounded-xl border-slate-200">
                  <SelectValue placeholder="All Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="h-72 bg-slate-200 animate-pulse rounded-2xl"
                  />
                ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Wrench className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No Service Requests
              </h3>
              <p className="text-slate-600">
                All caught up! No requests match your filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredRequests.map((request, index) => {
                const { color, icon: StatusIcon } = getStatusProps(
                  request.status
                );
                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="group relative overflow-hidden bg-white border border-slate-200/60 hover:shadow-2xl hover:shadow-red-500/10 hover:border-red-200 transition-all duration-300 hover:-translate-y-1">
                      {/* Gradient accent on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-red-50/0 via-transparent to-pink-50/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                      <CardHeader className="pb-3 relative">
                        <div className="flex items-start justify-between mb-3">
                          <CardTitle className="text-lg font-bold text-slate-900 line-clamp-2 pr-4 group-hover:text-red-900 transition-colors">
                            {request.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge
                              className={`${color} border font-semibold shadow-sm`}
                            >
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {request.status.replace("_", " ")}
                            </Badge>
                            {isNewItem(request.created_at) && (
                              <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-md animate-pulse">
                                <Sparkles className="w-3 h-3 mr-1" />
                                New
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className="capitalize font-medium border-slate-300 bg-slate-50"
                          >
                            {request.request_type.replace("_", " ")}
                          </Badge>
                          <Badge
                            className={`${getPriorityColor(
                              request.priority
                            )} border capitalize font-semibold shadow-sm`}
                          >
                            {request.priority} priority
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 relative">
                        <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed">
                          {request.description}
                        </p>
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 space-y-3 border border-slate-200/60">
                          <div className="flex items-center gap-3 text-slate-700 text-sm">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              <User className="w-4 h-4 text-red-600" />
                            </div>
                            <span className="font-medium">
                              {request.homeowner?.full_name ||
                                getHomeownerName(request.homeowner_id)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-slate-700 text-sm">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              <Building2 className="w-4 h-4 text-purple-600" />
                            </div>
                            <span className="font-medium">
                              {request.property?.name ||
                                getPropertyName(request.property_id)}
                            </span>
                          </div>
                          {request.scheduled_date && (
                            <div className="flex items-center gap-3 text-slate-700 text-sm">
                              <div className="p-2 bg-white rounded-lg shadow-sm">
                                <Calendar className="w-4 h-4 text-orange-600" />
                              </div>
                              <span className="font-medium">
                                Scheduled:{" "}
                                {format(
                                  new Date(request.scheduled_date),
                                  "MMM d, yyyy"
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 pt-3 border-t border-slate-200/60 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                          Requested on{" "}
                          {formattedDate(
                            new Date(request.created_date),
                            "MMM d, yyyy, p"
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all rounded-lg font-semibold shadow-sm hover:shadow"
                            onClick={() => handleEditRequest(request)}
                          >
                            <Edit className="w-4 h-4 mr-1.5" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-red-700 border-red-300 hover:bg-red-50 hover:border-red-400 transition-all rounded-lg font-semibold shadow-sm hover:shadow"
                            onClick={() => handleDeleteRequest(request)}
                          >
                            <Trash2 className="w-4 h-4 mr-1.5" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Modern Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
          >
            {/* Header with gradient */}
            <div className="sticky top-0 bg-gradient-to-r from-red-500 to-red-600 px-8 py-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Wrench className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      New Service Request
                    </h2>
                    <p className="text-red-100 mt-1 text-sm">
                      Create a new maintenance request for homeowners
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full hover:bg-white/20 text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
              <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-slate-50">
                {/* Request Details Section */}
                <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <div className="p-2 bg-red-50 rounded-lg">
                      <FileText className="w-5 h-5 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Request Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <Label
                        htmlFor="title"
                        className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"
                      >
                        Request Title <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) =>
                          handleInputChange("title", e.target.value)
                        }
                        placeholder="e.g., Leaky faucet in kitchen"
                        className="mt-2 h-11 border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label
                          htmlFor="request_type"
                          className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"
                        >
                          Request Type <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.request_type}
                          onValueChange={(value) =>
                            handleInputChange("request_type", value)
                          }
                        >
                          <SelectTrigger className="mt-2 h-11 border-slate-300 rounded-xl">
                            <SelectValue placeholder="Select request type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="plumbing">
                              🔧 Plumbing
                            </SelectItem>
                            <SelectItem value="electrical">
                              ⚡ Electrical
                            </SelectItem>
                            <SelectItem value="hvac">❄️ HVAC</SelectItem>
                            <SelectItem value="appliance">
                              🏠 Appliance
                            </SelectItem>
                            <SelectItem value="general_maintenance">
                              🔨 General Maintenance
                            </SelectItem>
                            <SelectItem value="landscaping">
                              🌳 Landscaping
                            </SelectItem>
                            <SelectItem value="security">
                              🔒 Security
                            </SelectItem>
                            <SelectItem value="cleaning">
                              🧹 Cleaning
                            </SelectItem>
                            <SelectItem value="other">📋 Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label
                          htmlFor="priority"
                          className="text-sm font-bold text-slate-700 mb-2"
                        >
                          Priority Level
                        </Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value) =>
                            handleInputChange("priority", value)
                          }
                        >
                          <SelectTrigger className="mt-2 h-11 border-slate-300 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">🟢 Low Priority</SelectItem>
                            <SelectItem value="medium">
                              🟡 Medium Priority
                            </SelectItem>
                            <SelectItem value="high">
                              🟠 High Priority
                            </SelectItem>
                            <SelectItem value="urgent">🔴 Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Homeowner & Property Section */}
                <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Homeowner & Property
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label
                        htmlFor="homeowner"
                        className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"
                      >
                        Homeowner <span className="text-red-500">*</span>
                      </Label>
                      <ReactSelect
                        className="mt-2"
                        options={homeowners.map((homeowner) => ({
                          value: homeowner.id,
                          label: `${homeowner.full_name} (${homeowner.email})`,
                        }))}
                        value={
                          formData.homeowner_id
                            ? {
                                value: formData.homeowner_id,
                                label: homeowners.find(
                                  (h) => h.id === formData.homeowner_id
                                )
                                  ? `${
                                      homeowners.find(
                                        (h) => h.id === formData.homeowner_id
                                      ).full_name
                                    } (${
                                      homeowners.find(
                                        (h) => h.id === formData.homeowner_id
                                      ).email
                                    })`
                                  : "Select homeowner",
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
                            minHeight: "44px",
                            borderRadius: "0.75rem",
                            borderColor: "#cbd5e1",
                          }),
                        }}
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="property"
                        className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"
                      >
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
                            handleInputChange(
                              "property_id",
                              selectedOption ? selectedOption.value : ""
                            )
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
                </div>

                {/* Additional Details Section */}
                <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Additional Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <Label
                        htmlFor="scheduled_date"
                        className="text-sm font-bold text-slate-700 mb-2"
                      >
                        Scheduled Date (Optional)
                      </Label>
                      <Input
                        id="scheduled_date"
                        type="date"
                        value={formData.scheduled_date}
                        onChange={(e) =>
                          handleInputChange("scheduled_date", e.target.value)
                        }
                        className="mt-2 h-11 border-slate-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="description"
                        className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"
                      >
                        Description <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          handleInputChange("description", e.target.value)
                        }
                        placeholder="Provide detailed description of the issue, including location, severity, and any other relevant information..."
                        rows={6}
                        className="mt-2 resize-none border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl text-base leading-relaxed"
                        required
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer with Actions */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-8 py-6 rounded-b-3xl shadow-lg">
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">
                  <span className="text-red-500">*</span> Required fields
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 h-11 rounded-xl border-slate-300 hover:bg-slate-50 font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      submitting ||
                      !formData.title ||
                      !formData.description ||
                      !formData.request_type ||
                      !formData.homeowner_id ||
                      !formData.property_id
                    }
                    onClick={handleSubmit}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 h-11 rounded-xl hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Creating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Create Request
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Service Request Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Edit Service Request
                  </h2>
                  <p className="text-slate-600 mt-1">
                    Update service request information
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingRequest(null);
                    resetForm();
                  }}
                  className="rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label
                    htmlFor="edit-title"
                    className="text-sm font-semibold text-slate-900"
                  >
                    Request Title *
                  </Label>
                  <Input
                    id="edit-title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="e.g., Leaky faucet in kitchen"
                    className="mt-2"
                    required
                  />
                </div>

                <div>
                  <Label
                    htmlFor="edit-request_type"
                    className="text-sm font-semibold text-slate-900"
                  >
                    Request Type *
                  </Label>
                  <Select
                    value={formData.request_type}
                    onValueChange={(value) =>
                      handleInputChange("request_type", value)
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select request type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="hvac">HVAC</SelectItem>
                      <SelectItem value="appliance">Appliance</SelectItem>
                      <SelectItem value="general_maintenance">
                        General Maintenance
                      </SelectItem>
                      <SelectItem value="landscaping">Landscaping</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label
                    htmlFor="edit-priority"
                    className="text-sm font-semibold text-slate-900"
                  >
                    Priority
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      handleInputChange("priority", value)
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label
                    htmlFor="edit-status"
                    className="text-sm font-semibold text-slate-900"
                  >
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      handleInputChange("status", value)
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label
                    htmlFor="edit-homeowner"
                    className="text-sm font-semibold text-slate-900"
                  >
                    Homeowner *
                  </Label>
                  <ReactSelect
                    className="mt-2"
                    options={homeowners.map((homeowner) => ({
                      value: homeowner.id.toString(),
                      label: `${homeowner.full_name} - Unit ${
                        homeowner.unit_number
                      }${
                        homeowner.property_info_tbl
                          ? ` (${homeowner.property_info_tbl.property_title})`
                          : ""
                      }`,
                    }))}
                    value={
                      formData.homeowner_id
                        ? {
                            value: formData.homeowner_id,
                            label: homeowners.find(
                              (h) => h.id.toString() === formData.homeowner_id
                            )
                              ? `${
                                  homeowners.find(
                                    (h) =>
                                      h.id.toString() === formData.homeowner_id
                                  ).full_name
                                } - Unit ${
                                  homeowners.find(
                                    (h) =>
                                      h.id.toString() === formData.homeowner_id
                                  ).unit_number
                                }${
                                  homeowners.find(
                                    (h) =>
                                      h.id.toString() === formData.homeowner_id
                                  ).property_info_tbl
                                    ? ` (${
                                        homeowners.find(
                                          (h) =>
                                            h.id.toString() ===
                                            formData.homeowner_id
                                        ).property_info_tbl.property_title
                                      })`
                                    : ""
                                }`
                              : "Select homeowner",
                          }
                        : null
                    }
                    onChange={handleHomeownerChange}
                    placeholder="Search and select a homeowner..."
                    isClearable
                    isSearchable
                  />
                </div>

                <div>
                  <Label
                    htmlFor="edit-property"
                    className="text-sm font-semibold text-slate-900"
                  >
                    Property *
                  </Label>
                  <Input
                    type="text"
                    className="mt-2 bg-slate-100 cursor-not-allowed"
                    value={
                      formData.property_id &&
                      homeowners.find(
                        (h) => h.id.toString() === formData.homeowner_id
                      )?.property_info_tbl
                        ? homeowners.find(
                            (h) => h.id.toString() === formData.homeowner_id
                          ).property_info_tbl.property_title
                        : ""
                    }
                    placeholder="Select homeowner first"
                    readOnly
                  />
                </div>

                <div>
                  <Label
                    htmlFor="edit-scheduled_date"
                    className="text-sm font-semibold text-slate-900"
                  >
                    Scheduled Date
                  </Label>
                  <Input
                    id="edit-scheduled_date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) =>
                      handleInputChange("scheduled_date", e.target.value)
                    }
                    className="mt-2"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label
                    htmlFor="edit-description"
                    className="text-sm font-semibold text-slate-900"
                  >
                    Description *
                  </Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    placeholder="Provide detailed description of the issue..."
                    rows={4}
                    className="mt-2 resize-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingRequest(null);
                    resetForm();
                  }}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    !formData.title ||
                    !formData.description ||
                    !formData.request_type ||
                    !formData.homeowner_id ||
                    !formData.property_id
                  }
                  className="bg-gradient-to-r from-red-400 to-red-500 text-white px-8 hover:from-red-600 hover:to-red-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Update Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) =>
            e.target === e.currentTarget && setIsDeleteModalOpen(false)
          }
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 text-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      Delete Service Request
                    </h3>
                    <p className="text-red-100 text-sm mt-1">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <button
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingRequest(null);
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
                  Are you sure you want to delete this service request?
                </h4>
                {deletingRequest && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-4 text-left">
                    <h5 className="font-medium text-slate-900 mb-1">
                      {deletingRequest.title}
                    </h5>
                    <p className="text-sm text-slate-600 mb-2">
                      {deletingRequest.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="capitalize">
                        {deletingRequest.request_type}
                      </span>
                      <span className="capitalize">
                        {deletingRequest.priority} priority
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                      <span>
                        {deletingRequest.homeowner?.full_name ||
                          getHomeownerName(deletingRequest.homeowner_id)}
                      </span>
                      <span>
                        {deletingRequest.property?.name ||
                          getPropertyName(deletingRequest.property_id)}
                      </span>
                    </div>
                  </div>
                )}
                <p className="text-slate-600">
                  This will permanently delete the service request and all
                  associated data. This action cannot be reversed.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingRequest(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    submitting ? "opacity-80 cursor-not-allowed" : ""
                  }`}
                  onClick={handleConfirmDelete}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Request
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
