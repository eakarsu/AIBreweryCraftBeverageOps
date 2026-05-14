import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaPlus, FaSearch, FaChevronLeft, FaChevronRight, FaFilePdf, FaExchangeAlt } from 'react-icons/fa';
import { getAll, create, update, remove, updateBatchStatus, downloadBrewSheet } from '../services/api';
import Modal from '../components/Modal';
import DetailPanel from '../components/DetailPanel';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';

const featureConfigs = {
  'brew-logs': {
    title: 'Brew Log',
    columns: ['batch_id', 'recipe_name', 'style', 'brew_date', 'status'],
    fields: [
      { name: 'batch_id', label: 'Batch ID', type: 'text' },
      { name: 'recipe_name', label: 'Recipe Name', type: 'text' },
      { name: 'style', label: 'Style', type: 'text' },
      { name: 'brew_date', label: 'Brew Date', type: 'date' },
      { name: 'brewer', label: 'Brewer', type: 'text' },
      { name: 'grain_bill', label: 'Grain Bill', type: 'textarea' },
      { name: 'hops', label: 'Hops', type: 'textarea' },
      { name: 'yeast', label: 'Yeast', type: 'text' },
      { name: 'mash_temp', label: 'Mash Temp (F)', type: 'number' },
      { name: 'og', label: 'Original Gravity', type: 'number', step: '0.001' },
      { name: 'fg', label: 'Final Gravity', type: 'number', step: '0.001' },
      { name: 'abv', label: 'ABV %', type: 'number', step: '0.1' },
      { name: 'ibu', label: 'IBU', type: 'number' },
      { name: 'volume_gallons', label: 'Volume (Gallons)', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['planning', 'brewing', 'fermenting', 'conditioning', 'completed'] },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'tanks': {
    title: 'Tank Management',
    columns: ['name', 'type', 'capacity_gallons', 'status', 'current_batch'],
    fields: [
      { name: 'name', label: 'Tank Name', type: 'text' },
      { name: 'type', label: 'Type', type: 'select', options: ['fermenter', 'brite', 'hot_liquor', 'cold_liquor', 'mash_tun', 'kettle'] },
      { name: 'capacity_gallons', label: 'Capacity (Gallons)', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['available', 'in_use', 'cleaning', 'maintenance'] },
      { name: 'current_batch', label: 'Current Batch', type: 'text' },
      { name: 'temperature', label: 'Temperature (F)', type: 'number' },
      { name: 'pressure_psi', label: 'Pressure (PSI)', type: 'number', step: '0.1' },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'raw-materials': {
    title: 'Raw Materials',
    columns: ['name', 'category', 'quantity', 'unit', 'status'],
    fields: [
      { name: 'name', label: 'Material Name', type: 'text' },
      { name: 'category', label: 'Category', type: 'select', options: ['grain', 'hops', 'yeast', 'adjunct', 'chemical', 'other'] },
      { name: 'quantity', label: 'Quantity', type: 'number' },
      { name: 'unit', label: 'Unit', type: 'select', options: ['lbs', 'oz', 'kg', 'g', 'each', 'gallons', 'liters'] },
      { name: 'supplier', label: 'Supplier', type: 'text' },
      { name: 'lot_number', label: 'Lot Number', type: 'text' },
      { name: 'cost_per_unit', label: 'Cost per Unit ($)', type: 'number', step: '0.01' },
      { name: 'reorder_point', label: 'Reorder Point', type: 'number' },
      { name: 'expiration_date', label: 'Expiration Date', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['in_stock', 'low_stock', 'out_of_stock', 'ordered'] },
      { name: 'storage_location', label: 'Storage Location', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'fermentation-logs': {
    title: 'Fermentation Logs',
    columns: ['batch_id', 'tank_id', 'temperature', 'gravity', 'date'],
    fields: [
      { name: 'batch_id', label: 'Batch ID', type: 'text' },
      { name: 'tank_id', label: 'Tank ID', type: 'text' },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'time', label: 'Time', type: 'time' },
      { name: 'temperature', label: 'Temperature (F)', type: 'number', step: '0.1' },
      { name: 'gravity', label: 'Gravity', type: 'number', step: '0.001' },
      { name: 'ph', label: 'pH', type: 'number', step: '0.01' },
      { name: 'dissolved_oxygen', label: 'Dissolved Oxygen (ppb)', type: 'number' },
      { name: 'pressure_psi', label: 'Pressure (PSI)', type: 'number', step: '0.1' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'completed', 'stalled'] },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'packaging-runs': {
    title: 'Packaging Runs',
    columns: ['batch_id', 'package_type', 'quantity', 'date', 'status'],
    fields: [
      { name: 'batch_id', label: 'Batch ID', type: 'text' },
      { name: 'package_type', label: 'Package Type', type: 'select', options: ['can_12oz', 'can_16oz', 'bottle_12oz', 'bottle_22oz', 'keg_half', 'keg_sixth', 'crowler'] },
      { name: 'quantity', label: 'Quantity', type: 'number' },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'line', label: 'Packaging Line', type: 'text' },
      { name: 'operator', label: 'Operator', type: 'text' },
      { name: 'fill_level', label: 'Fill Level (oz)', type: 'number', step: '0.1' },
      { name: 'co2_volumes', label: 'CO2 Volumes', type: 'number', step: '0.1' },
      { name: 'do_level', label: 'DO Level (ppb)', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['scheduled', 'in_progress', 'completed', 'cancelled'] },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'kegs': {
    title: 'Keg Tracking',
    columns: ['keg_id', 'beer_name', 'size', 'status', 'location'],
    fields: [
      { name: 'keg_id', label: 'Keg ID', type: 'text' },
      { name: 'beer_name', label: 'Beer Name', type: 'text' },
      { name: 'batch_id', label: 'Batch ID', type: 'text' },
      { name: 'size', label: 'Size', type: 'select', options: ['half_barrel', 'quarter_barrel', 'sixth_barrel', 'slim_quarter'] },
      { name: 'fill_date', label: 'Fill Date', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['full', 'tapped', 'empty', 'cleaning', 'lost', 'damaged'] },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'distributor', label: 'Distributor', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'pos-transactions': {
    title: 'Taproom POS',
    columns: ['transaction_id', 'date', 'items', 'total', 'payment_method'],
    fields: [
      { name: 'transaction_id', label: 'Transaction ID', type: 'text' },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'time', label: 'Time', type: 'time' },
      { name: 'items', label: 'Items', type: 'textarea' },
      { name: 'subtotal', label: 'Subtotal ($)', type: 'number', step: '0.01' },
      { name: 'tax', label: 'Tax ($)', type: 'number', step: '0.01' },
      { name: 'tip', label: 'Tip ($)', type: 'number', step: '0.01' },
      { name: 'total', label: 'Total ($)', type: 'number', step: '0.01' },
      { name: 'payment_method', label: 'Payment Method', type: 'select', options: ['cash', 'credit', 'debit', 'tab', 'gift_card'] },
      { name: 'server', label: 'Server', type: 'text' },
      { name: 'customer_name', label: 'Customer Name', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'distributions': {
    title: 'Distribution',
    columns: ['distributor', 'order_date', 'product', 'quantity', 'status'],
    fields: [
      { name: 'distributor', label: 'Distributor', type: 'text' },
      { name: 'order_date', label: 'Order Date', type: 'date' },
      { name: 'delivery_date', label: 'Delivery Date', type: 'date' },
      { name: 'product', label: 'Product', type: 'text' },
      { name: 'quantity', label: 'Quantity', type: 'number' },
      { name: 'unit_price', label: 'Unit Price ($)', type: 'number', step: '0.01' },
      { name: 'total', label: 'Total ($)', type: 'number', step: '0.01' },
      { name: 'region', label: 'Region', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] },
      { name: 'tracking_number', label: 'Tracking Number', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'lab-results': {
    title: 'Lab Results',
    columns: ['batch_id', 'test_type', 'result', 'date', 'status'],
    fields: [
      { name: 'batch_id', label: 'Batch ID', type: 'text' },
      { name: 'test_type', label: 'Test Type', type: 'select', options: ['gravity', 'ph', 'abv', 'ibu', 'color_srm', 'dissolved_oxygen', 'microbiology', 'sensory'] },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'result', label: 'Result Value', type: 'text' },
      { name: 'unit', label: 'Unit', type: 'text' },
      { name: 'expected_range', label: 'Expected Range', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['pass', 'fail', 'pending', 'retest'] },
      { name: 'technician', label: 'Technician', type: 'text' },
      { name: 'equipment_used', label: 'Equipment Used', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'equipment': {
    title: 'Equipment',
    columns: ['name', 'type', 'status', 'last_maintenance', 'location'],
    fields: [
      { name: 'name', label: 'Equipment Name', type: 'text' },
      { name: 'type', label: 'Type', type: 'select', options: ['brewing', 'fermentation', 'packaging', 'cooling', 'cleaning', 'lab', 'other'] },
      { name: 'manufacturer', label: 'Manufacturer', type: 'text' },
      { name: 'model', label: 'Model', type: 'text' },
      { name: 'serial_number', label: 'Serial Number', type: 'text' },
      { name: 'purchase_date', label: 'Purchase Date', type: 'date' },
      { name: 'last_maintenance', label: 'Last Maintenance', type: 'date' },
      { name: 'next_maintenance', label: 'Next Maintenance', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'maintenance', 'repair', 'decommissioned'] },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'events': {
    title: 'Events',
    columns: ['name', 'type', 'date', 'capacity', 'status'],
    fields: [
      { name: 'name', label: 'Event Name', type: 'text' },
      { name: 'type', label: 'Type', type: 'select', options: ['tasting', 'release', 'private', 'fundraiser', 'music', 'food_truck', 'trivia', 'other'] },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'start_time', label: 'Start Time', type: 'time' },
      { name: 'end_time', label: 'End Time', type: 'time' },
      { name: 'capacity', label: 'Capacity', type: 'number' },
      { name: 'tickets_sold', label: 'Tickets Sold', type: 'number' },
      { name: 'ticket_price', label: 'Ticket Price ($)', type: 'number', step: '0.01' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'status', label: 'Status', type: 'select', options: ['scheduled', 'active', 'completed', 'cancelled'] },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'loyalty-members': {
    title: 'Loyalty Program',
    columns: ['name', 'email', 'tier', 'points', 'status'],
    fields: [
      { name: 'name', label: 'Member Name', type: 'text' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'tier', label: 'Tier', type: 'select', options: ['bronze', 'silver', 'gold', 'platinum'] },
      { name: 'points', label: 'Points', type: 'number' },
      { name: 'join_date', label: 'Join Date', type: 'date' },
      { name: 'visits', label: 'Total Visits', type: 'number' },
      { name: 'total_spent', label: 'Total Spent ($)', type: 'number', step: '0.01' },
      { name: 'birthday', label: 'Birthday', type: 'date' },
      { name: 'favorite_beer', label: 'Favorite Beer', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'suspended'] },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'financial-records': {
    title: 'Financial Records',
    columns: ['date', 'type', 'category', 'amount', 'description'],
    fields: [
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'type', label: 'Type', type: 'select', options: ['revenue', 'expense', 'cogs', 'payroll', 'tax'] },
      { name: 'category', label: 'Category', type: 'select', options: ['taproom_sales', 'distribution', 'merchandise', 'events', 'ingredients', 'utilities', 'rent', 'labor', 'marketing', 'equipment', 'other'] },
      { name: 'amount', label: 'Amount ($)', type: 'number', step: '0.01' },
      { name: 'description', label: 'Description', type: 'text' },
      { name: 'reference_number', label: 'Reference #', type: 'text' },
      { name: 'vendor', label: 'Vendor/Source', type: 'text' },
      { name: 'payment_method', label: 'Payment Method', type: 'select', options: ['cash', 'check', 'ach', 'credit_card', 'wire'] },
      { name: 'status', label: 'Status', type: 'select', options: ['pending', 'completed', 'cancelled'] },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'cip-schedules': {
    title: 'CIP Schedules',
    columns: ['equipment', 'scheduled_date', 'cip_type', 'status', 'operator'],
    fields: [
      { name: 'equipment', label: 'Equipment', type: 'text' },
      { name: 'scheduled_date', label: 'Scheduled Date', type: 'date' },
      { name: 'completed_date', label: 'Completed Date', type: 'date' },
      { name: 'cip_type', label: 'CIP Type', type: 'select', options: ['caustic', 'acid', 'sanitizer', 'full_cycle', 'rinse_only'] },
      { name: 'chemical_concentration', label: 'Chemical Concentration (%)', type: 'number', step: '0.1' },
      { name: 'temperature', label: 'Temperature (F)', type: 'number' },
      { name: 'duration_minutes', label: 'Duration (min)', type: 'number' },
      { name: 'operator', label: 'Operator', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['scheduled', 'in_progress', 'completed', 'overdue'] },
      { name: 'verification', label: 'Verification', type: 'select', options: ['pass', 'fail', 'pending'] },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'vendors': {
    title: 'Vendors',
    columns: ['name', 'category', 'contact_name', 'phone', 'status'],
    fields: [
      { name: 'name', label: 'Vendor Name', type: 'text' },
      { name: 'category', label: 'Category', type: 'select', options: ['grain', 'hops', 'yeast', 'packaging', 'chemicals', 'equipment', 'services', 'other'] },
      { name: 'contact_name', label: 'Contact Name', type: 'text' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'address', label: 'Address', type: 'textarea' },
      { name: 'website', label: 'Website', type: 'text' },
      { name: 'payment_terms', label: 'Payment Terms', type: 'select', options: ['net_15', 'net_30', 'net_60', 'cod', 'prepaid'] },
      { name: 'lead_time_days', label: 'Lead Time (Days)', type: 'number' },
      { name: 'rating', label: 'Rating (1-5)', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'pending', 'blacklisted'] },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'batches': {
    title: 'Batch Manager',
    columns: ['batch_number', 'recipe_name', 'style', 'status', 'brew_date'],
    fields: [
      { name: 'batch_number', label: 'Batch Number', type: 'text' },
      { name: 'recipe_name', label: 'Recipe Name', type: 'text' },
      { name: 'style', label: 'Style', type: 'select', options: ['IPA', 'Double IPA', 'Session IPA', 'West Coast IPA', 'New England IPA', 'Pale Ale', 'American Pale Ale', 'Stout', 'Imperial Stout', 'Oatmeal Stout', 'Porter', 'Lager', 'Pilsner', 'Wheat Beer', 'Hefeweizen', 'Witbier', 'Sour', 'Berliner Weisse', 'Gose', 'Saison', 'Belgian Strong', 'Dubbel', 'Tripel', 'Barleywine', 'Amber Ale', 'Brown Ale', 'Red Ale', 'Kolsch', 'Cream Ale', 'Other'] },
      { name: 'abv', label: 'ABV (%)', type: 'number', step: '0.1' },
      { name: 'og', label: 'Original Gravity', type: 'number', step: '0.001' },
      { name: 'fg', label: 'Final Gravity', type: 'number', step: '0.001' },
      { name: 'ibu', label: 'IBU', type: 'number' },
      { name: 'batch_size_gallons', label: 'Batch Size (Gallons)', type: 'number' },
      { name: 'brew_date', label: 'Brew Date', type: 'date' },
      { name: 'brewer', label: 'Brewer', type: 'text' },
      { name: 'yeast_strain', label: 'Yeast Strain', type: 'text' },
      { name: 'fermentation_temp', label: 'Fermentation Temp (F)', type: 'number', step: '0.1' },
      { name: 'status', label: 'Status', type: 'select', options: ['planned', 'mashing', 'boiling', 'fermenting', 'conditioning', 'packaging', 'sold'] },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
};

function FeaturePage() {
  const { featureName } = useParams();
  const navigate = useNavigate();
  const config = featureConfigs[featureName];

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const PAGE_SIZE = 20;
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    setPage(1);
  }, [featureName]);

  useEffect(() => {
    fetchData();
  }, [featureName, page]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAll(featureName, { page, limit: PAGE_SIZE });
      const payload = res.data;
      if (payload && payload.data && payload.pagination) {
        setData(payload.data);
        setPagination(payload.pagination);
      } else if (Array.isArray(payload)) {
        setData(payload);
        setPagination(null);
      } else {
        setData(payload?.data || []);
        setPagination(payload?.pagination || null);
      }
    } catch (err) {
      toast.error('Failed to load data');
      setData([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [featureName, page]);

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const s = search.toLowerCase();
    return data.filter((item) =>
      Object.values(item).some(
        (v) => v && String(v).toLowerCase().includes(s)
      )
    );
  }, [data, search]);

  const initFormData = (item = null) => {
    if (!config) return {};
    const fd = {};
    config.fields.forEach((f) => {
      fd[f.name] = item ? (item[f.name] ?? '') : '';
    });
    return fd;
  };

  const handleAdd = () => {
    setFormData(initFormData());
    setShowAddModal(true);
  };

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleEdit = () => {
    setFormData(initFormData(selectedItem));
    setShowDetailModal(false);
    setShowEditModal(true);
  };

  const handleDeletePrompt = () => {
    setShowDetailModal(false);
    setShowConfirm(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await create(featureName, formData);
      toast.success('Record created successfully');
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create record');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const id = selectedItem._id || selectedItem.id;
    try {
      await update(featureName, id, formData);
      toast.success('Record updated successfully');
      setShowEditModal(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update record');
    }
  };

  const handleDelete = async () => {
    const id = selectedItem._id || selectedItem.id;
    try {
      await remove(featureName, id);
      toast.success('Record deleted successfully');
      setShowConfirm(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete record');
    }
  };

  const handleFieldChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDownloadBrewSheet = async (item) => {
    try {
      const res = await downloadBrewSheet(item.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `brew-sheet-${item.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Brew sheet downloaded');
    } catch (err) {
      toast.error('Failed to download brew sheet');
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus || !selectedItem) return;
    try {
      await updateBatchStatus(selectedItem.id, newStatus);
      toast.success(`Batch status updated to ${newStatus}`);
      setShowStatusModal(false);
      setShowDetailModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  const getStatusClass = (value) => {
    if (typeof value !== 'string') return '';
    const v = value.toLowerCase();
    if (['active', 'pass', 'completed', 'delivered', 'paid', 'available', 'clean', 'approved', 'full', 'in_stock'].includes(v)) return 'badge-success';
    if (['pending', 'in_progress', 'in_use', 'fermenting', 'scheduled', 'processing', 'brewing', 'conditioning', 'tapped', 'low_stock', 'ordered'].includes(v)) return 'badge-warning';
    if (['fail', 'lost', 'cancelled', 'overdue', 'inactive', 'damaged', 'rejected', 'failed', 'out_of_stock', 'empty', 'stalled', 'decommissioned', 'blacklisted', 'suspended'].includes(v)) return 'badge-danger';
    return 'badge-neutral';
  };

  const renderFormFields = (fields) =>
    fields.map((field) => (
      <div className="form-group" key={field.name}>
        <label>{field.label}</label>
        {field.type === 'select' ? (
          <select
            className="form-control"
            value={formData[field.name] || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          >
            <option value="">Select...</option>
            {field.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        ) : field.type === 'textarea' ? (
          <textarea
            className="form-control"
            value={formData[field.name] || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.label}
            rows={3}
          />
        ) : (
          <input
            type={field.type}
            className="form-control"
            value={formData[field.name] || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.label}
            step={field.step}
          />
        )}
      </div>
    ));

  if (!config) {
    return (
      <div className="page-container">
        <p>Feature not found: {featureName}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const columns = config.columns;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>
          <button className="btn btn-icon" onClick={() => navigate('/dashboard')}>
            <FaArrowLeft />
          </button>
          {config.title}
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {featureName === 'batches' && selectedItem && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => { setNewStatus(selectedItem.status || 'planned'); setShowStatusModal(true); }}>
                <FaExchangeAlt /> Change Status
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleDownloadBrewSheet(selectedItem)}>
                <FaFilePdf /> Brew Sheet
              </button>
            </>
          )}
          <button className="btn btn-primary" onClick={handleAdd}>
            <FaPlus /> Add New
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-bar">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {filteredData.length} record{filteredData.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text={`Loading ${config.title}...`} />
      ) : filteredData.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#128466;</div>
          <h3>No records found</h3>
          <p>Click "Add New" to create your first {config.title.toLowerCase()} record.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col}>
                    {col.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, idx) => (
                <tr key={item._id || item.id || idx} onClick={() => handleRowClick(item)}>
                  {columns.map((col) => {
                    const val = item[col];
                    const isStatus = col === 'status' || col === 'result' || col === 'verification';
                    return (
                      <td key={col}>
                        {isStatus && val ? (
                          <span className={`badge ${getStatusClass(val)}`}>
                            {String(val).replace(/_/g, ' ')}
                          </span>
                        ) : val !== undefined && val !== null ? (
                          String(val).length > 60 ? String(val).substring(0, 60) + '...' : String(val)
                        ) : (
                          '-'
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <FaChevronLeft /> Prev
          </button>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
          >
            Next <FaChevronRight />
          </button>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={`Add ${config.title}`}>
        <form onSubmit={handleCreate}>
          {renderFormFields(config.fields)}
          <div className="modal-footer" style={{ padding: '1rem 0 0', borderTop: '1px solid var(--border-primary)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title={`${config.title} Details`}>
        <DetailPanel data={selectedItem} onEdit={handleEdit} onDelete={handleDeletePrompt} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={`Edit ${config.title}`}>
        <form onSubmit={handleUpdate}>
          {renderFormFields(config.fields)}
          <div className="modal-footer" style={{ padding: '1rem 0 0', borderTop: '1px solid var(--border-primary)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="Delete Record"
        message={`Are you sure you want to delete this ${config.title.toLowerCase()} record? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />

      {/* Batch Status Change Modal */}
      {featureName === 'batches' && (
        <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Change Batch Status">
          <div className="form-group">
            <label>New Status</label>
            <select className="form-control" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
              {['planned', 'mashing', 'boiling', 'fermenting', 'conditioning', 'packaging', 'sold'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="modal-footer" style={{ padding: '1rem 0 0', borderTop: '1px solid var(--border-primary)' }}>
            <button className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleStatusChange}>Update Status</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default FeaturePage;
