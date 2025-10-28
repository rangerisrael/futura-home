'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, AlertTriangle, Loader2, MapPin, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from '@supabase/supabase-js';
import { isNewItem, getRelativeTime } from '@/lib/utils';
import { toast } from 'react-toastify';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LotManagement() {
  const [lots, setLots] = useState([]);
  const [filteredLots, setFilteredLots] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLot, setEditingLot] = useState(null);
  const [deletingLot, setDeletingLot] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    lot_number: '',
    is_occupied: false
  });

  useEffect(() => {
    loadLots();
  }, []);

  useEffect(() => {
    filterLots();
  }, [lots, searchTerm]);

  // Load all lots
  const loadLots = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lot_tbl')
        .select('*')
        .order('lot_number', { ascending: true });

      if (error) throw error;
      setLots(data || []);
    } catch (error) {
      console.error('Error loading lots:', error);
      toast.error('Failed to load lots');
    } finally {
      setLoading(false);
    }
  };

  // Filter lots based on search
  const filterLots = () => {
    if (!searchTerm.trim()) {
      setFilteredLots(lots);
      return;
    }

    const filtered = lots.filter(lot =>
      lot.lot_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLots(filtered);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      lot_number: '',
      is_occupied: false
    });
  };

  // Open add modal
  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (lot) => {
    setEditingLot(lot);
    setFormData({
      lot_number: lot.lot_number,
      is_occupied: lot.is_occupied
    });
    setIsEditModalOpen(true);
  };

  // Open delete modal
  const openDeleteModal = (lot) => {
    setDeletingLot(lot);
    setIsDeleteModalOpen(true);
  };

  // Add new lot
  const handleAddLot = async (e) => {
    e.preventDefault();

    if (!formData.lot_number.trim()) {
      toast.error('Please enter a lot number');
      return;
    }

    try {
      setIsSubmitting(true);

      // Check if lot number already exists
      const { data: existingLot, error: checkError } = await supabase
        .from('lot_tbl')
        .select('lot_number')
        .eq('lot_number', formData.lot_number.trim())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means no rows returned, which is what we want
        throw checkError;
      }

      if (existingLot) {
        toast.error(`Lot #${formData.lot_number} already exists!`);
        setIsSubmitting(false);
        return;
      }

      // If lot doesn't exist, proceed with insert
      const { data, error } = await supabase
        .from('lot_tbl')
        .insert([{
          lot_number: formData.lot_number.trim(),
          is_occupied: formData.is_occupied
        }])
        .select();

      if (error) throw error;

      toast.success('Lot added successfully!');
      setIsModalOpen(false);
      resetForm();
      loadLots();
    } catch (error) {
      console.error('Error adding lot:', error);
      toast.error(error.message || 'Failed to add lot');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update lot
  const handleUpdateLot = async (e) => {
    e.preventDefault();

    if (!formData.lot_number.trim()) {
      toast.error('Please enter a lot number');
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from('lot_tbl')
        .update({
          lot_number: formData.lot_number.trim(),
          is_occupied: formData.is_occupied,
          updated_at: new Date().toISOString()
        })
        .eq('lot_id', editingLot.lot_id);

      if (error) throw error;

      toast.success('Lot updated successfully!');
      setIsEditModalOpen(false);
      setEditingLot(null);
      resetForm();
      loadLots();
    } catch (error) {
      console.error('Error updating lot:', error);
      toast.error(error.message || 'Failed to update lot');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete lot
  const handleDeleteLot = async () => {
    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from('lot_tbl')
        .delete()
        .eq('lot_id', deletingLot.lot_id);

      if (error) throw error;

      toast.success('Lot deleted successfully!');
      setIsDeleteModalOpen(false);
      setDeletingLot(null);
      loadLots();
    } catch (error) {
      console.error('Error deleting lot:', error);
      toast.error(error.message || 'Failed to delete lot');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats
  const stats = {
    total: lots.length,
    occupied: lots.filter(l => l.is_occupied).length,
    available: lots.filter(l => !l.is_occupied).length
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lot Management</h1>
          <p className="text-gray-500 mt-1">Manage property lots and availability</p>
        </div>
        <Button onClick={openAddModal} className="gap-2">
          <Plus className="w-4 h-4" />
          Add New Lot
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lots</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.occupied}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <XCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.available}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search lot number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lots List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredLots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <MapPin className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'No lots found matching your search' : 'No lots added yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLots.map((lot, index) => (
            <motion.div
              key={lot.lot_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        Lot #{lot.lot_number}
                        {isNewItem(lot.created_at) && (
                          <Badge variant="secondary" className="text-xs">New</Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {getRelativeTime(lot.created_at)}
                      </p>
                    </div>
                    <Badge
                      variant={lot.is_occupied ? "destructive" : "default"}
                      className={lot.is_occupied ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}
                    >
                      {lot.is_occupied ? 'Occupied' : 'Available'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(lot)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteModal(lot)}
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Add New Lot</h2>
                    <p className="text-red-100 text-sm">Create a new property lot</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="text-white/80 hover:text-white transition-colors"
                  disabled={isSubmitting}
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleAddLot} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Lot Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    name="lot_number"
                    value={formData.lot_number}
                    onChange={handleInputChange}
                    placeholder="e.g., A-101, B-205, etc."
                    className="pl-10 h-12 border-2 border-gray-200 focus:border-red-500 rounded-xl transition-colors"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">Enter a unique identifier for this lot</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      {formData.is_occupied ? (
                        <CheckCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <label htmlFor="is_occupied" className="text-sm font-semibold text-gray-700 cursor-pointer">
                        Occupancy Status
                      </label>
                      <p className="text-xs text-gray-500">
                        {formData.is_occupied ? 'This lot is currently occupied' : 'This lot is available'}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="is_occupied"
                      name="is_occupied"
                      checked={formData.is_occupied}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 h-12 rounded-xl border-2 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/30"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Create Lot
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Edit className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Edit Lot</h2>
                    <p className="text-red-100 text-sm">Update lot information</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingLot(null);
                    resetForm();
                  }}
                  className="text-white/80 hover:text-white transition-colors"
                  disabled={isSubmitting}
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateLot} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Lot Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    name="lot_number"
                    value={formData.lot_number}
                    onChange={handleInputChange}
                    placeholder="e.g., A-101, B-205, etc."
                    className="pl-10 h-12 border-2 border-gray-200 focus:border-red-500 rounded-xl transition-colors"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">Enter a unique identifier for this lot</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      {formData.is_occupied ? (
                        <CheckCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <label htmlFor="is_occupied_edit" className="text-sm font-semibold text-gray-700 cursor-pointer">
                        Occupancy Status
                      </label>
                      <p className="text-xs text-gray-500">
                        {formData.is_occupied ? 'This lot is currently occupied' : 'This lot is available'}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="is_occupied_edit"
                      name="is_occupied"
                      checked={formData.is_occupied}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingLot(null);
                    resetForm();
                  }}
                  className="flex-1 h-12 rounded-xl border-2 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/30"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="w-5 h-5 mr-2" />
                      Update Lot
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Delete Lot</h2>
                  <p className="text-red-100 text-sm">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-900 mb-1">
                      Warning: Permanent Deletion
                    </p>
                    <p className="text-sm text-red-700">
                      Are you sure you want to delete <span className="font-bold">Lot #{deletingLot?.lot_number}</span>?
                      This will permanently remove all associated data.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingLot(null);
                  }}
                  className="flex-1 h-12 rounded-xl border-2 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteLot}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/30"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5 mr-2" />
                      Delete Lot
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
