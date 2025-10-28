'use client'
import React, { useState, useEffect } from 'react';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Home, Bed, Bath, Maximize, User, Phone, Mail, Search, MapPin } from 'lucide-react';
import { Homeowner, Property } from '@/lib/data';

export default function PropertyMap() {
  const [properties, setProperties] = useState([]);
  const [homeowners, setHomeowners] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [propertiesData, homeownersData] = await Promise.all([
        Property,
        Homeowner
      ]);
      setProperties(propertiesData);
      setHomeowners(homeownersData);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  const getHomeownerForProperty = (propertyId) => {
    return homeowners.find(h => h.property_id === propertyId);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'occupied': return 'bg-green-500';
      case 'vacant': return 'bg-red-500';
      case 'for_sale': return 'bg-blue-500';
      case 'under_construction': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'occupied': return 'bg-green-100 text-green-800 border-green-200';
      case 'vacant': return 'bg-red-100 text-red-800 border-red-200';
      case 'for_sale': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'under_construction': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Create a grid layout for Camella Koronadal blocks
  const createPropertyBlocks = () => {
    const filteredProperties = properties.filter(property => 
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.unit_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group properties by blocks (assuming unit numbers have block prefixes)
    const blocks = {};
    filteredProperties.forEach(property => {
      const blockLetter = property.unit_number ? property.unit_number.charAt(0).toUpperCase() : 'A';
      if (!blocks[blockLetter]) {
        blocks[blockLetter] = [];
      }
      blocks[blockLetter].push(property);
    });

    return Object.entries(blocks).map(([blockLetter, blockProperties]) => (
      <motion.div
        key={blockLetter}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-4 bg-gradient-to-r from-red-50 to-rose-50 px-4 py-3 rounded-xl border border-red-100">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Block {blockLetter}</h3>
            <p className="text-xs text-slate-600">{blockProperties.length} Properties</p>
          </div>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
          {blockProperties.map((property) => {
            const homeowner = getHomeownerForProperty(property.id);
            const isSelected = selectedProperty?.id === property.id;
            return (
              <motion.div
                key={property.id}
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`relative cursor-pointer rounded-xl p-3 border-2 transition-all duration-300 ${
                  isSelected
                    ? 'border-red-500 bg-gradient-to-br from-red-50 to-rose-50 shadow-lg shadow-red-500/20'
                    : 'border-slate-200 bg-white hover:border-red-300 hover:shadow-md'
                }`}
                onClick={() => setSelectedProperty(property)}
              >
                {/* Status indicator dot with pulse animation */}
                <div className="absolute top-2 right-2">
                  <div className={`relative w-3 h-3 rounded-full ${getStatusColor(property.status)} ${property.status === 'occupied' ? 'animate-pulse' : ''}`}>
                    <div className={`absolute inset-0 rounded-full ${getStatusColor(property.status)} opacity-40 animate-ping`}></div>
                  </div>
                </div>

                {/* House icon */}
                <div className="flex flex-col items-center gap-1">
                  <div className={`p-2 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-red-100'
                      : property.status === 'occupied'
                        ? 'bg-green-50'
                        : 'bg-slate-50'
                  }`}>
                    <Home className={`w-6 h-6 ${
                      isSelected
                        ? 'text-red-600'
                        : property.status === 'occupied'
                          ? 'text-green-600'
                          : 'text-slate-400'
                    }`} />
                  </div>
                  <span className={`text-xs font-bold ${isSelected ? 'text-red-700' : 'text-slate-700'}`}>
                    {property.unit_number || 'N/A'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    ));
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Property Map</h1>
            <p className="text-lg text-slate-600">Interactive property layout with detailed house information</p>
          </div>
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm">
            <MapPin className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Properties</p>
              <p className="text-xl font-bold text-slate-900">{properties.length}</p>
            </div>
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-lg"
        >
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              placeholder="Search by unit number or property name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Map Area */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
                    <Home className="w-5 h-5 text-white" />
                  </div>
                  Property Layout
                </CardTitle>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-green-700 font-medium">Occupied</span>
                  </div>
                  <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-red-700 font-medium">Vacant</span>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-blue-700 font-medium">For Sale</span>
                  </div>
                  <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-orange-700 font-medium">Construction</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-slate-500 mt-4">Loading properties...</p>
                  </div>
                ) : properties.length === 0 ? (
                  <div className="text-center py-12">
                    <Home className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Properties Found</h3>
                    <p className="text-slate-500">No properties available to display on the map</p>
                  </div>
                ) : (
                  createPropertyBlocks()
                )}
              </CardContent>
            </Card>
          </div>

          {/* Property Details Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg sticky top-6">
              <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100">
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
                    <Home className="w-4 h-4 text-white" />
                  </div>
                  Property Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {selectedProperty ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Property Header */}
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/30">
                        <Home className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-3">{selectedProperty.name}</h3>
                      <Badge className={`${getStatusBadgeColor(selectedProperty.status)} border font-medium text-sm px-3 py-1`}>
                        {selectedProperty.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    {/* Property Info */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 space-y-3 border border-slate-200">
                      <div className="flex items-center justify-between py-2 border-b border-slate-200">
                        <span className="text-sm font-semibold text-slate-600">Unit Number</span>
                        <span className="font-bold text-slate-900 text-lg">{selectedProperty.unit_number || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-slate-200">
                        <span className="text-sm font-semibold text-slate-600">Property Type</span>
                        <span className="capitalize text-slate-900 font-medium">{selectedProperty.property_type}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-semibold text-slate-600">Address</span>
                        <span className="text-sm text-slate-900 text-right font-medium max-w-[200px]">{selectedProperty.address}</span>
                      </div>
                    </div>

                    {/* Property Specifications */}
                    {(selectedProperty.bedrooms || selectedProperty.bathrooms || selectedProperty.floor_area) && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                        <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                          <Maximize className="w-4 h-4" />
                          Specifications
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          {selectedProperty.bedrooms && (
                            <div className="text-center bg-white rounded-lg p-3 border border-blue-100">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <Bed className="w-5 h-5 text-blue-600" />
                              </div>
                              <p className="text-xs text-blue-600 font-medium mb-1">Bedrooms</p>
                              <p className="font-bold text-blue-900 text-lg">{selectedProperty.bedrooms}</p>
                            </div>
                          )}
                          {selectedProperty.bathrooms && (
                            <div className="text-center bg-white rounded-lg p-3 border border-blue-100">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <Bath className="w-5 h-5 text-blue-600" />
                              </div>
                              <p className="text-xs text-blue-600 font-medium mb-1">Bathrooms</p>
                              <p className="font-bold text-blue-900 text-lg">{selectedProperty.bathrooms}</p>
                            </div>
                          )}
                          {selectedProperty.floor_area && (
                            <div className="text-center bg-white rounded-lg p-3 border border-blue-100">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <Maximize className="w-5 h-5 text-blue-600" />
                              </div>
                              <p className="text-xs text-blue-600 font-medium mb-1">Floor Area</p>
                              <p className="font-bold text-blue-900 text-lg">{selectedProperty.floor_area}m²</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Homeowner Information */}
                    {(() => {
                      const homeowner = getHomeownerForProperty(selectedProperty.id);
                      return homeowner ? (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
                          <h4 className="font-bold text-green-900 mb-4 flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <User className="w-4 h-4 text-green-600" />
                            </div>
                            Homeowner Information
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-green-100">
                              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-green-600" />
                              </div>
                              <span className="text-sm font-semibold text-green-900">{homeowner.full_name}</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-green-100">
                              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Mail className="w-4 h-4 text-green-600" />
                              </div>
                              <span className="text-sm text-green-800">{homeowner.email}</span>
                            </div>
                            {homeowner.phone && (
                              <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-green-100">
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Phone className="w-4 h-4 text-green-600" />
                                </div>
                                <span className="text-sm text-green-800">{homeowner.phone}</span>
                              </div>
                            )}
                            {homeowner.monthly_dues && (
                              <div className="pt-2 mt-2 border-t border-green-200">
                                <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-green-100">
                                  <span className="text-sm font-semibold text-green-700">Monthly Dues</span>
                                  <span className="font-bold text-green-900 text-lg">₱{homeowner.monthly_dues.toLocaleString()}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        selectedProperty.status === 'vacant' && (
                          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-5 text-center border border-red-200">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <Home className="w-8 h-8 text-red-600" />
                            </div>
                            <h4 className="font-bold text-red-900 mb-2">Property Available</h4>
                            <p className="text-sm text-red-700">This unit is currently vacant and available for occupancy.</p>
                          </div>
                        )
                      );
                    })()}

                    {/* Amenities */}
                    {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
                      <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-5 border border-purple-200">
                        <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                          <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Maximize className="w-3 h-3 text-purple-600" />
                          </div>
                          Amenities
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedProperty.amenities.map((amenity, idx) => (
                            <Badge key={idx} className="bg-white text-purple-700 border border-purple-200 font-medium text-xs px-3 py-1">
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="text-center py-12">
                    <Home className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Select a Property</h3>
                    <p className="text-slate-500">Click on any house in the map to view detailed information</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}