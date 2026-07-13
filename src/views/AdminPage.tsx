'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useSEO } from '../hooks/useSEO';
import {
  LayoutDashboard, ShoppingBag, Package, Users, MessageSquare,
  BarChart3, Settings, Plus, Pencil, Trash2, Search, Eye,
  TrendingUp, X, Upload, ChevronDown, LogOut,
  CheckCircle, Clock, Truck, AlertCircle, FileText, Printer,
  Boxes, ArrowUpDown, ArrowUp, ArrowDown, Download, ChevronLeft,
  ChevronRight, PackagePlus, PackageMinus, SlidersHorizontal,
  AlertTriangle, CheckSquare, MinusSquare, Bell, Percent, Volume2, Globe, Mail, Sparkles, Menu
} from 'lucide-react';
import { Product } from '../types';
import { saveProducts } from '../utils/storage';

/* ─── HELPERS ────────────────────────────────── */
const statusColors: Record<string, string> = {
  // Payment Statuses
  paid:       'bg-[#f0f7ff] text-[#164475] border border-[#164475]/30',
  unpaid:     'bg-[#fff1f0] text-[#cf1322] border border-[#ffa39e]',
  refunded:   'bg-[#f1f1f1] text-[#616161] border border-[#d9d9d9]',
  'payment pending': 'bg-[#fff0db] text-[#8a5b00] border border-[#ffddb0]',
  pending:    'bg-[#fff0db] text-[#8a5b00] border border-[#ffddb0]',
  
  // Fulfillment Statuses
  unfulfilled: 'bg-[#fff0db] text-[#8a5b00] border border-[#ffddb0]',
  fulfilled:   'bg-[#f0f7ff] text-[#164475] border border-[#164475]/30',
  shipped:     'bg-[#e6f7ff] text-[#0050b3] border border-[#91d5ff]',
  processing:  'bg-[#e6f7ff] text-[#0050b3] border border-[#91d5ff]',
  delivered:   'bg-[#f0f7ff] text-[#164475] border border-[#164475]/30',
  cancelled:   'bg-[#fff1f0] text-[#cf1322] border border-[#ffa39e]',
  
  // Account Statuses
  active:     'bg-[#f0f7ff] text-[#164475] border border-[#164475]/30',
  draft:      'bg-[#f1f1f1] text-[#616161] border border-[#d9d9d9]',
  inactive:   'bg-[#fff1f0] text-[#cf1322] border border-[#ffa39e]',
};

const StatusBadge = ({ s }: { s: string }) => (
  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${statusColors[s?.toLowerCase()] ?? 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
    {s}
  </span>
);

const getInventoryStatus = (stock: number, threshold: number = 5): string => {
  if (stock <= 0) return 'out of stock';
  if (stock <= threshold) return 'low stock';
  return 'in stock';
};

const exportCSV = (data: any[], filename: string, columns: { key: string; label: string }[]) => {
  const header = columns.map(c => c.label).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const val = c.key.split('.').reduce((o, k) => o?.[k], row);
      return `"${String(val ?? '').replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

/* ─── PAGINATION HOOK ────────────────────────── */
function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paged = items.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [items.length]);
  return { paged, page, setPage, totalPages };
}

function PaginationBar({ page, totalPages, setPage, total }: {
  page: number; totalPages: number; setPage: (p: number) => void; total: number;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-[#ebebeb] bg-white">
      <span className="text-xs text-[#5c5c5c] font-semibold">{total} records · Page {page} of {totalPages}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded border border-[#cbd5e1] disabled:opacity-40 hover:bg-[#f6f6f7] transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
          return (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition-colors ${p === page ? 'bg-[#164475] text-white' : 'border border-[#cbd5e1] hover:bg-[#f6f6f7] text-[#5c5c5c]'}`}>
              {p}
            </button>
          );
        })}
        <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded border border-[#cbd5e1] disabled:opacity-40 hover:bg-[#f6f6f7] transition-colors">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─── SORT HEADER ────────────────────────────── */
function SortTh({ label, field, sortField, sortDir, onSort }: {
  label: string; field: string; sortField: string; sortDir: 'asc' | 'desc'; onSort: (f: string) => void;
}) {
  const active = sortField === field;
  return (
    <th className="text-left text-xs font-bold text-[#5c5c5c] uppercase tracking-wider px-5 py-4 cursor-pointer select-none group"
      onClick={() => onSort(field)}>
      <div className="flex items-center gap-1.5">
        {label}
        <span className={`transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
          {active ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#164475]" /> : <ArrowDown className="w-3 h-3 text-[#164475]" />) : <ArrowUpDown className="w-3 h-3" />}
        </span>
      </div>
    </th>
  );
}

/* ─── PRODUCT FORM MODAL ─────────────────────── */
interface ProductFormProps {
  product?: any;
  onClose: () => void;
  onSave: (p: any) => void;
}

function ProductFormModal({ product, onClose, onSave }: ProductFormProps) {
  const [form, setForm] = useState({
    name: product?.name ?? '',
    code: product?.code ?? '',
    price: product?.price ?? 0,
    comparePrice: product?.comparePrice ?? 0,
    category: product?.category ?? 'Peripherals',
    tag: product?.tag ?? '',
    stock: product?.stock ?? 0,
    lowStockThreshold: product?.lowStockThreshold ?? 5,
    description: product?.description ?? '',
    image: product?.image ?? '',
    additionalImages: product?.additionalImages ?? [],
    costPerItem: product?.costPerItem ?? 0,
    barcode: product?.barcode ?? '',
    vendor: product?.vendor ?? '',
    productType: product?.productType ?? '',
    trackQuantity: product?.trackQuantity ?? true,
    continueSellingOutOfStock: product?.continueSellingOutOfStock ?? false,
    weight: product?.weight ?? 0,
    weightUnit: product?.weightUnit ?? 'kg',
    chargeTax: product?.chargeTax ?? true,
    status: product?.status ?? 'active',
    variants: product?.variants ?? [],
  });
  const [variantInput, setVariantInput] = useState('');

  const categories = ['Desktops','Laptops','Components','Peripherals','Accessories','Monitors','Networking','Headphones','Earphones','Speakers'];

  const addVariant = () => {
    if (variantInput.trim()) {
      setForm(f => ({ ...f, variants: [...f.variants, variantInput.trim()] }));
      setVariantInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#f6f6f7] rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-[#ebebeb]">
        <div className="flex items-center justify-between p-6 border-b border-[#ebebeb] bg-white sticky top-0 z-10">
          <h2 className="text-lg font-bold text-[#1a1a1a]">{product?._id ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded bg-[#f6f6f7] flex items-center justify-center hover:bg-[#ebebeb] transition-colors"><X className="w-4 h-4 text-[#5c5c5c]" /></button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Description */}
            <div className="bg-white p-5 rounded-lg border border-[#ebebeb] shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1a1a1a] mb-1.5">Title</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-3 py-2 border border-[#cbd5e1] bg-white rounded text-sm focus:outline-none focus:border-[#164475] focus:ring-1 focus:ring-[#164475]" placeholder="Short sleeve t-shirt" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1a1a1a] mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  rows={6} className="w-full px-3 py-2 border border-[#cbd5e1] bg-white rounded text-sm focus:outline-none focus:border-[#164475] focus:ring-1 focus:ring-[#164475] resize-none"
                  placeholder="Explain your product benefits..." />
              </div>
            </div>

            {/* Media */}
            <div className="bg-white p-5 rounded-lg border border-[#ebebeb] shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#1a1a1a]">Media</h3>
              <div>
                <label className="flex flex-col items-center justify-center border border-dashed border-[#cbd5e1] rounded py-8 bg-[#fafafa] hover:bg-[#f6f6f7] cursor-pointer transition-colors">
                  <Upload className="w-6 h-6 text-[#5c5c5c] mb-2" />
                  <span className="text-xs font-semibold text-[#164475]">Add files</span>
                  <input type="file" multiple accept="image/*" className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.forEach(file => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const base64 = reader.result as string;
                          setForm(prev => {
                            if (!prev.image) return { ...prev, image: base64 };
                            return { ...prev, additionalImages: [...prev.additionalImages, base64] };
                          });
                        };
                        reader.readAsDataURL(file);
                      });
                    }} />
                </label>
                {(form.image || form.additionalImages.length > 0) && (
                  <div className="flex flex-wrap gap-3 mt-4">
                    {[...(form.image ? [form.image] : []), ...form.additionalImages].map((img, idx) => (
                      <div key={idx} className="relative group w-20 h-20 rounded border border-[#cbd5e1] bg-white overflow-hidden flex-shrink-0">
                        <img src={img} alt="Preview" className="w-full h-full object-contain" />
                        <button type="button" onClick={() => {
                          if (idx === 0) {
                            const newAdditional = [...form.additionalImages];
                            const newMain = newAdditional.length > 0 ? newAdditional.shift() : '';
                            setForm({ ...form, image: newMain || '', additionalImages: newAdditional });
                          } else {
                            setForm({ ...form, additionalImages: form.additionalImages.filter((_: any, i: number) => i !== idx - 1) });
                          }
                        }} className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold shadow">✕</button>
                        {idx === 0 && <span className="absolute bottom-0 left-0 right-0 bg-[#164475] text-white text-[9px] font-bold text-center py-0.5">MAIN</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-white p-5 rounded-lg border border-[#ebebeb] shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#1a1a1a]">Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Price', key: 'price' },
                  { label: 'Compare-at price', key: 'comparePrice' },
                  { label: 'Cost per item', key: 'costPerItem' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-[#1a1a1a] mb-1.5">{label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c5c5c] text-sm">$</span>
                      <input type="number" value={(form as any)[key]} onChange={e => setForm({...form, [key]: +e.target.value})}
                        className="w-full pl-7 pr-3 py-2 border border-[#cbd5e1] bg-white rounded text-sm focus:outline-none focus:border-[#164475] focus:ring-1 focus:ring-[#164475]" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="chargeTax" checked={form.chargeTax} onChange={e => setForm({...form, chargeTax: e.target.checked})}
                  className="w-4 h-4 text-[#164475] border-[#cbd5e1] rounded focus:ring-[#164475]" />
                <label htmlFor="chargeTax" className="text-xs font-semibold text-[#5c5c5c] cursor-pointer">Charge tax on this product</label>
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-white p-5 rounded-lg border border-[#ebebeb] shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#1a1a1a]">Inventory</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1a1a1a] mb-1.5">SKU / Code</label>
                  <input value={form.code} onChange={e => setForm({...form, code: e.target.value})}
                    className="w-full px-3 py-2 border border-[#cbd5e1] bg-white rounded text-sm focus:outline-none focus:border-[#164475] focus:ring-1 focus:ring-[#164475]" placeholder="SKU-001" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1a1a1a] mb-1.5">Barcode</label>
                  <input value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})}
                    className="w-full px-3 py-2 border border-[#cbd5e1] bg-white rounded text-sm focus:outline-none focus:border-[#164475] focus:ring-1 focus:ring-[#164475]" placeholder="123456789" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1a1a1a] mb-1.5">Quantity</label>
                  <input type="number" value={form.stock} onChange={e => setForm({...form, stock: +e.target.value})}
                    className="w-full px-3 py-2 border border-[#cbd5e1] bg-white rounded text-sm focus:outline-none focus:border-[#164475] focus:ring-1 focus:ring-[#164475]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1a1a1a] mb-1.5">Threshold Alert</label>
                  <input type="number" value={form.lowStockThreshold} onChange={e => setForm({...form, lowStockThreshold: +e.target.value})}
                    className="w-full px-3 py-2 border border-[#cbd5e1] bg-white rounded text-sm focus:outline-none focus:border-[#164475] focus:ring-1 focus:ring-[#164475]" />
                </div>
              </div>
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="trackQuantity" checked={form.trackQuantity} onChange={e => setForm({...form, trackQuantity: e.target.checked})}
                    className="w-4 h-4 text-[#164475] border-[#cbd5e1] rounded focus:ring-[#164475]" />
                  <label htmlFor="trackQuantity" className="text-xs font-semibold text-[#5c5c5c] cursor-pointer">Track quantity</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="continueSelling" checked={form.continueSellingOutOfStock} onChange={e => setForm({...form, continueSellingOutOfStock: e.target.checked})}
                    className="w-4 h-4 text-[#164475] border-[#cbd5e1] rounded focus:ring-[#164475]" />
                  <label htmlFor="continueSelling" className="text-xs font-semibold text-[#5c5c5c] cursor-pointer">Continue selling when out of stock</label>
                </div>
              </div>
            </div>

            {/* Variants */}
            <div className="bg-white p-5 rounded-lg border border-[#ebebeb] shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#1a1a1a]">Variants</h3>
              <div className="flex gap-2">
                <input value={variantInput} onChange={e => setVariantInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVariant(); }}}
                  className="flex-1 px-3 py-2 border border-[#cbd5e1] bg-white rounded text-sm focus:outline-none focus:border-[#164475] focus:ring-1 focus:ring-[#164475]" placeholder="e.g. 16GB RAM / 512GB SSD" />
                <button type="button" onClick={addVariant} className="px-4 py-2 bg-[#164475] text-white rounded text-sm font-bold hover:bg-[#10355c] transition-colors">Add</button>
              </div>
              {form.variants.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.variants.map((v: string, i: number) => (
                    <span key={i} className="flex items-center gap-1.5 bg-[#f6f6f7] border border-[#cbd5e1] text-[#1a1a1a] text-xs font-semibold px-3 py-1 rounded">
                      {v}
                      <button type="button" onClick={() => setForm(f => ({ ...f, variants: f.variants.filter((_: any, idx: number) => idx !== i) }))}
                        className="text-gray-400 hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Status and Organization */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-lg border border-[#ebebeb] shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#1a1a1a]">Status</h3>
              <div>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                  className="w-full px-3 py-2 border border-[#cbd5e1] bg-white rounded text-sm focus:outline-none focus:border-[#164475] focus:ring-1 focus:ring-[#164475]">
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                </select>
                <p className="text-[10px] text-[#5c5c5c] mt-1">This product will be visible in the store if Active.</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[#ebebeb] shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#1a1a1a]">Product organization</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#1a1a1a] mb-1">Category *</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full px-3 py-2 border border-[#cbd5e1] bg-white rounded text-sm focus:outline-none">
                    {categories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1a1a1a] mb-1">Vendor</label>
                  <input value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})}
                    className="w-full px-3 py-2 border border-[#cbd5e1] bg-white rounded text-sm" placeholder="ASUS" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1a1a1a] mb-1">Product Type</label>
                  <input value={form.productType} onChange={e => setForm({...form, productType: e.target.value})}
                    className="w-full px-3 py-2 border border-[#cbd5e1] bg-white rounded text-sm" placeholder="Keyboard" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1a1a1a] mb-1">Badge Tag</label>
                  <select value={form.tag} onChange={e => setForm({...form, tag: e.target.value})}
                    className="w-full px-3 py-2 border border-[#cbd5e1] bg-white rounded text-sm">
                    <option value="">None</option>
                    {['New','Hot','Sale','Best Seller'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[#ebebeb] shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#1a1a1a]">Shipping</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#1a1a1a] mb-1">Weight</label>
                  <input type="number" step="0.01" value={form.weight} onChange={e => setForm({...form, weight: +e.target.value})}
                    className="w-full px-3 py-2 border border-[#cbd5e1] bg-white rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1a1a1a] mb-1">Unit</label>
                  <select value={form.weightUnit} onChange={e => setForm({...form, weightUnit: e.target.value})}
                    className="w-full px-3 py-2 border border-[#cbd5e1] bg-white rounded text-sm">
                    {['kg','g','lb','oz'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-[#ebebeb] bg-white sticky bottom-0 z-10 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-[#cbd5e1] rounded text-sm font-bold text-[#5c5c5c] hover:bg-[#f6f6f7] transition-colors">Cancel</button>
          <button onClick={() => { onSave(form); onClose(); }}
            className="px-5 py-2 bg-[#164475] hover:bg-[#10355c] text-white rounded text-sm font-bold transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── STOCK ADJUST MODAL ─────────────────────── */
function StockAdjustModal({ product, onClose, onSave }: {
  product: any; onClose: () => void; onSave: (id: string, newStock: number, log: any) => void;
}) {
  const [mode, setMode] = useState<'in' | 'out' | 'set'>('in');
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('');

  const preview = useMemo(() => {
    const cur = product.stock || 0;
    if (mode === 'in') return cur + qty;
    if (mode === 'out') return Math.max(0, cur - qty);
    return qty;
  }, [mode, qty, product.stock]);

  const handleSave = () => {
    const logEntry = {
      date: new Date().toISOString(),
      type: mode === 'in' ? 'Stock In' : mode === 'out' ? 'Stock Out' : 'Adjustment',
      qty: mode === 'out' ? -qty : qty,
      before: product.stock || 0,
      after: preview,
      reason: reason || 'Manual adjustment',
      productId: product._id || product.id,
    };
    onSave(product._id || product.id, preview, logEntry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md p-6 space-y-5 border border-[#ebebeb]">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1a1a1a]">Adjust Inventory</h2>
          <button onClick={onClose} className="w-8 h-8 rounded bg-[#f6f6f7] flex items-center justify-center hover:bg-[#ebebeb]"><X className="w-4 h-4 text-[#5c5c5c]" /></button>
        </div>

        <div className="flex items-center gap-3 bg-[#f6f6f7] p-3 rounded border border-[#ebebeb]">
          <img src={product.image} alt={product.name} className="w-12 h-12 object-contain bg-white rounded border border-[#cbd5e1] p-1 flex-shrink-0" />
          <div>
            <p className="font-bold text-[#1a1a1a] text-sm line-clamp-1">{product.name}</p>
            <p className="text-xs text-[#5c5c5c]">Current stock: <span className="font-bold text-[#164475]">{product.stock || 0}</span> units</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'in', label: 'Stock In', icon: PackagePlus, color: 'emerald' },
            { id: 'out', label: 'Stock Out', icon: PackageMinus, color: 'red' },
            { id: 'set', label: 'Set Exact', icon: SlidersHorizontal, color: 'blue' },
          ].map(({ id, label, icon: Icon, color }) => (
            <button key={id} onClick={() => setMode(id as any)}
              className={`py-2.5 rounded text-xs font-bold flex flex-col items-center gap-1 transition-all border ${mode === id
                ? color === 'emerald' ? 'bg-[#f0f7ff] border-[#cbd5e1] text-[#164475]'
                  : color === 'red' ? 'bg-[#fff1f0] border-[#cbd5e1] text-[#cf1322]'
                  : 'bg-[#e6f7ff] border-[#cbd5e1] text-[#0050b3]'
                : 'bg-[#f6f6f7] border-[#cbd5e1] text-[#5c5c5c] hover:bg-white'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1a1a1a] mb-1.5">
            {mode === 'in' ? 'Quantity to Add' : mode === 'out' ? 'Quantity to Remove' : 'Set New Quantity'}
          </label>
          <input type="number" min="0" value={qty} onChange={e => setQty(+e.target.value)}
            className="w-full px-3 py-2 border border-[#cbd5e1] rounded text-sm focus:outline-none focus:border-[#164475]" />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1a1a1a] mb-1.5">Reason (optional)</label>
          <input value={reason} onChange={e => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-[#cbd5e1] rounded text-sm focus:outline-none focus:border-[#164475]" placeholder="e.g. New shipment, damaged..." />
        </div>

        <div className="bg-[#f6f6f7] p-4 rounded border border-[#ebebeb] flex items-center justify-between">
          <span className="text-sm text-[#5c5c5c] font-semibold">New stock level:</span>
          <span className={`text-lg font-bold ${preview <= 0 ? 'text-[#cf1322]' : preview <= 5 ? 'text-[#8a5b00]' : 'text-[#164475]'}`}>{preview} units</span>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-[#cbd5e1] rounded text-sm font-bold text-[#5c5c5c] hover:bg-[#f6f6f7]">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 bg-[#164475] hover:bg-[#10355c] text-white rounded text-sm font-bold transition-colors">Confirm Adjustment</button>
        </div>
      </div>
    </div>
  );
}

interface NavSubItem {
  id: string;
  label: string;
}

interface NavItem {
  id: string;
  icon: any;
  label: string;
  subItems?: NavSubItem[];
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

/* ─── NAVIGATION ─────────────────────────────── */
const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { id: 'home', icon: LayoutDashboard, label: 'Home' },
      {
        id: 'orders',
        icon: Package,
        label: 'Orders',
        subItems: [
          { id: 'orders-list', label: 'All' },
          { id: 'drafts', label: 'Drafts' },
          { id: 'abandoned-checkouts', label: 'Abandoned checkouts' }
        ]
      },
      {
        id: 'products',
        icon: TagIcon,
        label: 'Products',
        subItems: [
          { id: 'products-list', label: 'All Products' },
          { id: 'inventory', label: 'Inventory' },
          { id: 'collections', label: 'Collections' }
        ]
      },
      { id: 'customers', icon: Users, label: 'Customers' },
      { id: 'growth', icon: TrendingUp, label: 'Growth' },
      { id: 'discounts', icon: Percent, label: 'Discounts' },
      {
        id: 'content',
        icon: FileText,
        label: 'Content',
        subItems: [
          { id: 'blogs', label: 'Blog posts' },
          { id: 'pages', label: 'Pages' }
        ]
      },
      { id: 'markets', icon: Globe, label: 'Markets' },
      {
        id: 'analytics',
        icon: BarChart3,
        label: 'Analytics',
        subItems: [
          { id: 'analytics', label: 'Dashboard' },
          { id: 'reports', label: 'Reports' },
          { id: 'live-view', label: 'Live View' }
        ]
      }
    ]
  },
  {
    title: 'Sales channels',
    items: [
      { id: 'online-store', icon: Globe, label: 'Online Store' },
      { id: 'agentic', icon: Sparkles, label: 'Agentic' }
    ]
  },
  {
    title: 'Apps',
    items: [
      { id: 'invoices', icon: Printer, label: 'Invoice Gen' }
    ]
  }
];

function TagIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.293 8.293a1.5 1.5 0 0 0 2.122 0l7.172-7.172a1.5 1.5 0 0 0 0-2.122l-8.293-8.293Z" />
      <path d="M6 6h.01" />
    </svg>
  );
}

/* ─── MAIN ADMIN PAGE ────────────────────────── */
export default function AdminPage() {
  useSEO({
    title: "Admin Panel | Adamjee Computers",
    description: "Administrative dashboard for Adamjee Computers — manage orders, products, customers and more.",
    keywords: "admin panel, adamjee computers, control panel, store management"
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    orders: true,
    products: true,
    content: true
  });

  const [stats, setStats] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<'live' | 'mock' | 'checking'>('checking');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);

  // Shopify top-bar interactive states
  const [topSearchQuery, setTopSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);

  // Gemini AI Product Description states & function
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGeneratedText, setAiGeneratedText] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const handleGenerateDescription = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setAiGeneratedText('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/ai-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await response.json();
      if (data.text) {
        setAiGeneratedText(data.text);
      } else {
        setAiGeneratedText('Failed to generate product description. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setAiGeneratedText('Error generating content. Please check API config.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Search and filters
  const [searchQ, setSearchQ] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
  const [productStatusFilter, setProductStatusFilter] = useState('All');
  const [orderTabFilter, setOrderTabFilter] = useState('All');

  // Sort
  const [productSortField, setProductSortField] = useState('name');
  const [productSortDir, setProductSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals / forms
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState<any>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any>(null);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<any>(null);
  const [stockAdjustProduct, setStockAdjustProduct] = useState<any>(null);
  const [inventoryDetailProduct, setInventoryDetailProduct] = useState<any>(null);

  // Forms
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [blogTitle, setBlogTitle] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [blogCategory, setBlogCategory] = useState('News');
  const [blogImage, setBlogImage] = useState('');
  const [blogExcerpt, setBlogExcerpt] = useState('');
  const [blogIsPublished, setBlogIsPublished] = useState(true);

  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<any>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState(10);
  const [discountMinReq, setDiscountMinReq] = useState(0);
  const [discountUsageLimit, setDiscountUsageLimit] = useState<string>('');

  // Selected customer profile view
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<any>(null);

  // Create Order View state
  const [showCreateOrderView, setShowCreateOrderView] = useState(false);
  const [coCustomerEmail, setCoCustomerEmail] = useState('');
  const [coCustomerName, setCoCustomerName] = useState('');
  const [coCustomerPhone, setCoCustomerPhone] = useState('');
  const [coCustomerAddress, setCoCustomerAddress] = useState('');
  const [coItems, setCoItems] = useState<any[]>([{ productId: '', quantity: 1, price: 0 }]);
  const [coDiscountVal, setCoDiscountVal] = useState(0);
  const [coDiscountType, setCoDiscountType] = useState('percentage');
  const [coTaxRate, setCoTaxRate] = useState(18);
  const [coShippingCost, setCoShippingCost] = useState(15);
  const [coNotes, setCoNotes] = useState('');
  const [coPaymentMethod, setCoPaymentMethod] = useState('cod');

  // Inventory movement log (localStorage)
  const [inventoryLog, setInventoryLog] = useState<any[]>([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('All');

  // Unified Inbox states
  const [inboxSubTab, setInboxSubTab] = useState<'chats' | 'contact'>('chats');
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [selectedChatSession, setSelectedChatSession] = useState<any>(null);

  // Invoice generator state
  const [invoiceCustomerName, setInvoiceCustomerName] = useState('');
  const [invoiceCustomerEmail, setInvoiceCustomerEmail] = useState('');
  const [invoiceCustomerPhone, setInvoiceCustomerPhone] = useState('');
  const [invoiceCustomerAddress, setInvoiceCustomerAddress] = useState('');
  const [invoiceShippingCharges, setInvoiceShippingCharges] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState('Cash');
  const [invoiceItems, setInvoiceItems] = useState<any[]>([{ productId: '', name: '', price: 0, cost: 0, quantity: 1 }]);
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState(0);
  const [invoiceTaxRate, setInvoiceTaxRate] = useState(18);
  const [showPrintInvoice, setShowPrintInvoice] = useState<any>(null);

  // Store Settings
  const [storeSettings, setStoreSettings] = useState({
    storeName: 'Adamjee Computers',
    storePhone: '+92 300 0000000',
    storeEmail: 'support@adamjeecomputers.com',
    storeAddress: 'Regal Plaza, Saddar, Karachi, Pakistan',
    gstNumber: 'GST-1234567-8',
    currency: '$',
    defaultTaxRate: 18,
    terms: '1. 1 Year warranty on premium products.\n2. 7-day window for hardware check/returns.\n3. No returns on burned, damaged, or modified parts.'
  });

  // Setup Guide checklists
  const [setupSteps, setSetupSteps] = useState([
    { id: 1, text: 'Add your first product', completed: true },
    { id: 2, text: 'Customize your online theme', completed: false },
    { id: 3, text: 'Configure shipping rates', completed: false },
    { id: 4, text: 'Set up Safepay or COD payment gateways', completed: false },
    { id: 5, text: 'Create a blog post for your launch', completed: false }
  ]);

  // Derived filter functions
  const filteredProducts = useMemo(() => {
    let arr = products.filter(p => {
      const matchSearch = !searchQ || p.name?.toLowerCase().includes(searchQ.toLowerCase()) || p.code?.toLowerCase().includes(searchQ.toLowerCase());
      const matchCat = productCategoryFilter === 'All' || p.category === productCategoryFilter;
      const matchStatus = productStatusFilter === 'All' || (p.status || 'active') === productStatusFilter.toLowerCase();
      return matchSearch && matchCat && matchStatus;
    });
    arr = [...arr].sort((a, b) => {
      let av: any = a[productSortField] ?? '';
      let bv: any = b[productSortField] ?? '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return productSortDir === 'asc' ? -1 : 1;
      if (av > bv) return productSortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [products, searchQ, productCategoryFilter, productStatusFilter, productSortField, productSortDir]);

  const filteredOrders = useMemo(() => {
    // Basic filter based on sub-tab choice
    return orders.filter(o => {
      const isDraft = o.orderStatus === 'draft';
      const isAbandoned = o.orderStatus === 'abandoned';
      
      if (activeTab === 'drafts') return isDraft;
      if (activeTab === 'abandoned-checkouts') return isAbandoned;
      
      // For orders-list tab
      if (isDraft || isAbandoned) return false; // Hide draft/abandoned in main list
      
      if (orderTabFilter === 'All') return true;
      if (orderTabFilter === 'Unfulfilled') return o.orderStatus === 'pending' || o.orderStatus === 'processing';
      if (orderTabFilter === 'Unpaid') return o.paymentStatus === 'pending' || o.paymentStatus === 'unpaid';
      return o.orderStatus === orderTabFilter.toLowerCase();
    });
  }, [orders, orderTabFilter, activeTab]);

  const filteredInventory = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !inventorySearch || p.name?.toLowerCase().includes(inventorySearch.toLowerCase()) || p.code?.toLowerCase().includes(inventorySearch.toLowerCase());
      const status = getInventoryStatus(p.stock || 0, p.lowStockThreshold || 5);
      const matchFilter = inventoryFilter === 'All' || status === inventoryFilter.toLowerCase();
      return matchSearch && matchFilter;
    });
  }, [products, inventorySearch, inventoryFilter]);

  const customerSpendings = useMemo(() => {
    const ltv: Record<string, { totalSpent: number; orderCount: number }> = {};
    orders.forEach(o => {
      const email = o.user?.email || o.guestEmail || 'guest@adamjee.com';
      if (!ltv[email]) {
        ltv[email] = { totalSpent: 0, orderCount: 0 };
      }
      if (o.orderStatus !== 'cancelled' && o.orderStatus !== 'draft') {
        ltv[email].totalSpent += o.total;
        ltv[email].orderCount += 1;
      }
    });
    return ltv;
  }, [orders]);

  const productCategories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))], [products]);

  // Pagination setups
  const { paged: pagedProducts, page: prodPage, setPage: setProdPage, totalPages: prodTotalPages } = usePagination(filteredProducts, 10);
  const { paged: pagedOrders, page: ordPage, setPage: setOrdPage, totalPages: ordTotalPages } = usePagination(filteredOrders, 10);
  const { paged: pagedInventory, page: invPageNum, setPage: setInvPage, totalPages: invTotalPages } = usePagination(filteredInventory, 10);
  const { paged: pagedUsers, page: usersPage, setPage: setUsersPage, totalPages: usersTotalPages } = usePagination(users, 10);
  const { paged: pagedInvoices, page: invoicesPage, setPage: setInvoicesPage, totalPages: invoicesTotalPages } = usePagination(invoices, 10);

  // ─── Restore admin session from localStorage on mount ───────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user?.role === 'admin') {
          setIsAuthenticated(true);
          setIsCheckingAuth(false);
          loadData(token);
        } else {
          setIsCheckingAuth(false);
        }
      } catch {
        setIsCheckingAuth(false);
      }
    } else {
      setIsCheckingAuth(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const log = JSON.parse(localStorage.getItem('inv_log') || '[]');
      setInventoryLog(log);
    } catch { setInventoryLog([]); }
    try {
      const savedSettings = JSON.parse(localStorage.getItem('store_settings') || 'null');
      if (savedSettings) {
        setStoreSettings(savedSettings);
        setInvoiceTaxRate(savedSettings.defaultTaxRate);
        setCoTaxRate(savedSettings.defaultTaxRate);
      }
    } catch {}
  }, []);

  // ─── Real-time order polling: refresh every 30s when on dashboard ────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const interval = setInterval(() => {
      loadData(token);
    }, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const loadData = async (token: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, prodRes, ordRes, msgRes, usersRes, invRes, blogRes, discRes, chatRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/products'),
        fetch('/api/orders', { headers }),
        fetch('/api/contact', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/invoices', { headers }),
        fetch('/api/blogs'),
        fetch('/api/discounts'),
        fetch('/api/admin/chats', { headers })
      ]);
      
      const statsData = statsRes.ok ? await statsRes.json() : {};
      const prodData = prodRes.ok ? await prodRes.json() : {};
      const ordData = ordRes.ok ? await ordRes.json() : {};
      const msgData = msgRes.ok ? await msgRes.json() : {};
      const usersData = usersRes.ok ? await usersRes.json() : {};
      const invData = invRes.ok ? await invRes.json() : {};
      const blogData = blogRes.ok ? await blogRes.json() : {};
      const discData = discRes.ok ? await discRes.json() : {};
      const chatData = chatRes.ok ? await chatRes.json() : {};

      setStats(statsData.stats || null);
      if (statsData.dbStatus) {
        setDbStatus(statsData.dbStatus);
      } else {
        setDbStatus('live');
      }
      setProducts(prodData.products || prodData.data || []);
      
      // Inject some mock draft and abandoned checkout orders for demonstration
      const fetchedOrders = ordData.orders || ordData.data || [];
      const hasDraft = fetchedOrders.some((o: any) => o.orderStatus === 'draft');
      const finalOrders = [...fetchedOrders];
      if (!hasDraft) {
        finalOrders.push({
          _id: 'draft1',
          orderId: 'ORD-5491',
          user: { name: 'Garth Huber', email: 'garth@huber.com' },
          total: 180.50,
          orderStatus: 'draft',
          paymentStatus: 'pending',
          paymentMethod: 'draft',
          createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
          items: [{ name: 'Aftershock mechanical gaming keyboard', price: 180.50, quantity: 1 }]
        });
        finalOrders.push({
          _id: 'abandoned1',
          orderId: 'ORD-9821',
          user: { name: 'Kevin Butler', email: 'kevin@butler.com' },
          total: 350.00,
          orderStatus: 'abandoned',
          paymentStatus: 'pending',
          paymentMethod: 'card',
          createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
          items: [{ name: 'Dell UltraSharp 29" Monitor', price: 350.00, quantity: 1 }]
        });
      }
      setOrders(finalOrders);

      setMessages(msgData.messages || msgData.data || []);
      setUsers(usersData.users || usersData.data || []);
      setInvoices(invData.invoices || []);
      setBlogs(blogData.blogs || []);
      setDiscounts(discData.discounts || []);
      setChatSessions(chatData.sessions || []);

      if (prodRes.ok) saveProducts(prodData.products || prodData.data || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setDbStatus('mock');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (res.ok && data.role === 'admin') {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({ _id: data._id, name: data.name, email: data.email, role: data.role }));
        setIsAuthenticated(true);
        loadData(data.token);
      } else {
        setLoginError(data.message || 'Access denied. Admins only.');
      }
    } catch { setLoginError('An error occurred during login.'); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  /* ─── CRUD HANDLERS ────────────────────────── */
  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Delete this product?')) {
      const token = localStorage.getItem('token');
      await fetch(`/api/products/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      loadData(token!);
    }
  };

  const handleSaveProduct = async (form: any) => {
    const token = localStorage.getItem('token');
    if (editingProduct?._id) {
      await fetch(`/api/products/${editingProduct._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
    } else {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
    }
    setEditingProduct(null);
    loadData(token!);
  };

  const handleStockAdjust = async (productId: string, newStock: number, logEntry: any) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ stock: newStock })
    });
    const newLog = [logEntry, ...inventoryLog];
    setInventoryLog(newLog);
    localStorage.setItem('inv_log', JSON.stringify(newLog));
    loadData(token!);
  };

  const handleMarkMessageRead = async (id: string) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/contact/${id}/read`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    loadData(token!);
  };

  const handleDeleteInvoice = async (id: string) => {
    if (window.confirm('Delete this invoice?')) {
      const token = localStorage.getItem('token');
      await fetch(`/api/invoices/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      loadData(token!);
    }
  };

  const handleSaveInvoice = async () => {
    if (!invoiceCustomerName.trim()) { alert('Please enter customer name'); return; }
    if (invoiceItems.length === 0 || invoiceItems.some(item => !item.name.trim())) { alert('Please add at least one valid item'); return; }
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = invoiceDiscountType === 'fixed' ? invoiceDiscountValue : (subtotal * invoiceDiscountValue) / 100;
    const taxedAmount = subtotal - discountAmount;
    const taxAmount = (taxedAmount * invoiceTaxRate) / 100;
    const total = taxedAmount + taxAmount + invoiceShippingCharges;
    const invoiceData = {
      customerName: invoiceCustomerName, customerEmail: invoiceCustomerEmail, customerPhone: invoiceCustomerPhone,
      customerAddress: invoiceCustomerAddress,
      shippingCharges: Number(invoiceShippingCharges),
      items: invoiceItems.map(item => ({ productId: item.productId || '', name: item.name, price: Number(item.price), cost: Number(item.cost), quantity: Number(item.quantity) })),
      discountType: invoiceDiscountType, discountValue: Number(invoiceDiscountValue), discountAmount, taxRate: Number(invoiceTaxRate), taxAmount, subtotal, total,
      paymentMethod: invoicePaymentMethod, notes: invoiceNotes
    };
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(invoiceData) });
      const data = await res.json();
      if (res.ok) {
        setInvoiceCustomerName(''); setInvoiceCustomerEmail(''); setInvoiceCustomerPhone('');
        setInvoiceCustomerAddress(''); setInvoiceShippingCharges(0); setInvoiceNotes('');
        setInvoiceDiscountValue(0); setInvoiceItems([{ productId: '', name: '', price: 0, cost: 0, quantity: 1 }]);
        loadData(token!);
        setShowPrintInvoice({ ...data.invoice, _storeSettings: storeSettings });
      } else { alert(data.message || 'Failed to save invoice'); }
    } catch { alert('Error saving invoice'); }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('store_settings', JSON.stringify(storeSettings));
    setInvoiceTaxRate(storeSettings.defaultTaxRate);
    setCoTaxRate(storeSettings.defaultTaxRate);
    alert('Settings saved successfully!');
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orderStatus: status })
    });
    loadData(token!);
  };

  /* ─── BLOGS HANDLERS ───────────────────────── */
  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogTitle.trim()) return;
    const token = localStorage.getItem('token');
    const blogData = { title: blogTitle, content: blogContent, category: blogCategory, image: blogImage, excerpt: blogExcerpt, isPublished: blogIsPublished };
    
    try {
      let res;
      if (editingBlog?._id) {
        res = await fetch(`/api/blogs/${editingBlog._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(blogData)
        });
      } else {
        res = await fetch('/api/blogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(blogData)
        });
      }
      if (res.ok) {
        setShowBlogForm(false);
        setEditingBlog(null);
        setBlogTitle(''); setBlogContent(''); setBlogImage(''); setBlogExcerpt('');
        loadData(token!);
      }
    } catch (err) {
      console.error('Error saving blog:', err);
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (window.confirm('Delete this blog post?')) {
      const token = localStorage.getItem('token');
      await fetch(`/api/blogs/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      loadData(token!);
    }
  };

  /* ─── DISCOUNTS HANDLERS ────────────────────── */
  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountCode.trim()) return;
    const token = localStorage.getItem('token');
    const discountData = {
      code: discountCode.toUpperCase(),
      type: discountType,
      value: Number(discountValue),
      minRequirement: Number(discountMinReq),
      usageLimit: discountUsageLimit ? Number(discountUsageLimit) : null,
      isActive: true
    };

    try {
      let res;
      if (editingDiscount?._id) {
        res = await fetch(`/api/discounts/${editingDiscount._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(discountData)
        });
      } else {
        res = await fetch('/api/discounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(discountData)
        });
      }
      if (res.ok) {
        setShowDiscountForm(false);
        setEditingDiscount(null);
        setDiscountCode(''); setDiscountValue(10); setDiscountMinReq(0); setDiscountUsageLimit('');
        loadData(token!);
      }
    } catch (err) {
      console.error('Error saving discount:', err);
    }
  };

  const handleDeleteDiscount = async (id: string) => {
    if (window.confirm('Delete this discount code?')) {
      const token = localStorage.getItem('token');
      await fetch(`/api/discounts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      loadData(token!);
    }
  };

  const handleToggleDiscountActive = async (disc: any) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/discounts/${disc._id || disc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive: !disc.isActive })
    });
    loadData(token!);
  };

  /* ─── SHOPIFY-STYLE ORDER BUILDER ─────────────── */
  const handleSaveCreateOrder = async (status: 'draft' | 'pending' | 'paid') => {
    if (!coCustomerName.trim()) { alert('Please enter customer name'); return; }
    if (coItems.length === 0 || coItems.some(i => !i.productId)) { alert('Please add products'); return; }

    const subtotal = coItems.reduce((sum, item) => {
      const prod = products.find(p => p._id === item.productId || p.id === item.productId);
      return sum + (prod ? prod.price : 0) * item.quantity;
    }, 0);
    const discountAmount = coDiscountType === 'fixed' ? coDiscountVal : (subtotal * coDiscountVal) / 100;
    const taxedAmount = subtotal - discountAmount;
    const taxAmount = (taxedAmount * coTaxRate) / 100;
    const total = taxedAmount + taxAmount + coShippingCost;

    const orderData = {
      items: coItems.map(item => {
        const prod = products.find(p => p._id === item.productId || p.id === item.productId);
        return {
          product: item.productId,
          name: prod ? prod.name : 'Product',
          price: prod ? prod.price : 0,
          quantity: item.quantity
        };
      }),
      shippingAddress: {
        fullName: coCustomerName,
        address: coCustomerAddress || 'Walk-in Store Order',
        city: 'Karachi',
        country: 'Pakistan',
        phone: coCustomerPhone
      },
      paymentMethod: coPaymentMethod,
      subtotal,
      shippingCost: coShippingCost,
      discount: discountAmount,
      total,
      notes: coNotes,
      guestEmail: coCustomerEmail || 'guest@adamjee.com',
      orderStatus: status,
      paymentStatus: status === 'paid' ? 'paid' : 'pending'
    };

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(orderData)
      });
      if (res.ok) {
        setShowCreateOrderView(false);
        setCoCustomerName(''); setCoCustomerEmail(''); setCoCustomerPhone(''); setCoCustomerAddress('');
        setCoItems([{ productId: '', quantity: 1, price: 0 }]); setCoDiscountVal(0); setCoNotes('');
        loadData(token!);
        alert('Order generated successfully!');
      } else {
        alert('Failed to place order');
      }
    } catch {
      alert('Error creating order');
    }
  };

  const handleProductSort = (field: string) => {
    if (productSortField === field) {
      setProductSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setProductSortField(field);
      setProductSortDir('asc');
    }
  };

  const activeStoreSettings = showPrintInvoice?._storeSettings || storeSettings;

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#164475] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#5c5c5c] font-semibold">Loading admin panel…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full border border-[#ebebeb]">
          <div className="flex items-center justify-center mx-auto mb-6">
            <div className="bg-[#164475] p-3 rounded-full flex items-center justify-center text-white">
              <ShoppingBag className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-[#1a1a1a] mb-1 text-center">Adamjee Computers</h2>
          <p className="text-xs text-[#5c5c5c] mb-6 text-center">Admin Portal — Use your admin credentials to login</p>
          {loginError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded border border-red-100">{loginError}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1a1a1a] mb-1.5">Email address</label>
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required
                disabled={loginLoading}
                className="w-full px-3 py-2 bg-white border border-[#cbd5e1] rounded text-sm focus:outline-none focus:border-[#164475] disabled:opacity-60"
                placeholder="admin@admin.gmail.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1a1a1a] mb-1.5">Password</label>
              <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required
                disabled={loginLoading}
                className="w-full px-3 py-2 bg-white border border-[#cbd5e1] rounded text-sm focus:outline-none focus:border-[#164475] disabled:opacity-60"
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loginLoading}
              className="w-full py-2 bg-[#164475] text-white rounded text-sm font-semibold hover:bg-[#10355c] transition-colors mt-6 disabled:opacity-70 flex items-center justify-center gap-2">
              {loginLoading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />Logging in…</>
              ) : 'Log in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f6f7] flex text-[#1a1a1a] font-sans antialiased" onClick={() => { setShowNotifications(false); setShowStoreDropdown(false); }}>
      {/* ─── SHOPIFY-STYLE DARK TOP BAR ─── */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-[#1a1a1a] z-50 flex items-center px-3 gap-2 lg:gap-4">
        {/* Hamburger — mobile only */}
        <button
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded hover:bg-[#303030] text-white flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); setSidebarOpen(prev => !prev); }}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        {/* Logo and Brand */}
        <div className="flex items-center gap-2 min-w-0 lg:min-w-[220px]">
          <div className="w-8 h-8 bg-[#164475] rounded flex items-center justify-center text-white">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-white text-sm tracking-tight">
            Adamjee Computers
          </span>
          <span className="hidden sm:inline text-[9px] font-bold bg-[#303030] text-[#a0a0a0] px-1.5 py-0.5 rounded border border-[#404040]">
            Spring '26
          </span>
        </div>

        {/* Centered Search Bar */}
        <div className="hidden sm:block flex-1 max-w-xl mx-auto relative">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              value={topSearchQuery}
              onChange={(e) => setTopSearchQuery(e.target.value)}
              className="w-full pl-9 pr-12 py-1.5 bg-[#303030] border border-[#404040] rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:bg-[#404040] focus:border-[#505050]"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold bg-[#505050] text-[#b0b0b0] px-1 py-0.5 rounded border border-[#505050]">
              CTRL K
            </span>
          </div>

          {/* Real-time search dropdown results */}
          {topSearchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-2xl border border-[#cbd5e1] max-h-80 overflow-y-auto z-[100] text-left">
              {(() => {
                const query = topSearchQuery.toLowerCase();
                const matchedProducts = products.filter(p => p.name?.toLowerCase().includes(query) || p.category?.toLowerCase().includes(query));
                const matchedOrders = orders.filter(o => o.orderId?.toLowerCase().includes(query) || o.customer?.name?.toLowerCase().includes(query));
                const matchedTabs = ['home', 'orders-list', 'products-list', 'customers', 'analytics', 'discounts', 'blogs', 'pages', 'settings', 'reports', 'live-view', 'invoices'].filter(t => t.includes(query));

                if (!matchedProducts.length && !matchedOrders.length && !matchedTabs.length) {
                  return <div className="p-4 text-xs text-[#5c5c5c] text-center">No results found for "{topSearchQuery}"</div>;
                }

                return (
                  <div className="divide-y divide-[#ebebeb] text-xs font-semibold">
                    {matchedTabs.length > 0 && (
                      <div className="p-2">
                        <p className="px-2 py-1 text-[9px] font-bold text-gray-400 uppercase">Pages</p>
                        {matchedTabs.slice(0, 4).map(t => (
                          <button key={t} onClick={() => { setActiveTab(t); setTopSearchQuery(''); }} className="w-full text-left px-3 py-1.5 text-[#1a1a1a] hover:bg-[#cbd5e1]/20 rounded capitalize">
                            Go to {t.replace('-list', '')}
                          </button>
                        ))}
                      </div>
                    )}
                    {matchedProducts.length > 0 && (
                      <div className="p-2">
                        <p className="px-2 py-1 text-[9px] font-bold text-gray-400 uppercase">Products ({matchedProducts.length})</p>
                        {matchedProducts.slice(0, 5).map(p => (
                          <button key={p._id || p.id} onClick={() => { setSelectedProductDetail(p); setActiveTab('products-list'); setTopSearchQuery(''); }} className="w-full text-left px-3 py-1.5 text-[#1a1a1a] hover:bg-[#cbd5e1]/20 rounded flex items-center gap-2">
                            <img src={p.image} alt="" className="w-6 h-6 object-contain bg-[#f6f6f7] rounded border p-0.5" />
                            <span>{p.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {matchedOrders.length > 0 && (
                      <div className="p-2">
                        <p className="px-2 py-1 text-[9px] font-bold text-gray-400 uppercase">Orders ({matchedOrders.length})</p>
                        {matchedOrders.slice(0, 5).map(o => (
                          <button key={o._id || o.orderId} onClick={() => { setSelectedOrderDetail(o); setActiveTab('orders-list'); setTopSearchQuery(''); }} className="w-full text-left px-3 py-1.5 text-[#1a1a1a] hover:bg-[#cbd5e1]/20 rounded">
                            {o.orderId} — {o.customer?.name} ({o.paymentStatus})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Right side options: notifications bell + store dropdown */}
        <div className="flex items-center gap-2.5 ml-auto">
          {/* Notifications Bell with real-time count */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifications(prev => !prev); setShowStoreDropdown(false); }}
              className="relative w-8 h-8 rounded hover:bg-[#303030] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4 text-gray-300" />
              {orders.filter(o => o.orderStatus === 'pending').length > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-1">
                  {orders.filter(o => o.orderStatus === 'pending').length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded border border-[#cbd5e1] shadow-2xl z-50 overflow-hidden text-left">
                <div className="px-3 py-2 border-b border-[#cbd5e1] font-bold text-xs bg-[#f6f6f7]">
                  Notifications ({orders.filter(o => o.orderStatus === 'pending').length} pending)
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-[#ebebeb] text-xs">
                  {orders.filter(o => o.orderStatus === 'pending').length === 0 ? (
                    <div className="p-4 text-center text-[#5c5c5c]">No new order notifications.</div>
                  ) : (
                    orders.filter(o => o.orderStatus === 'pending').slice(0, 5).map(o => (
                      <div key={o._id || o.orderId} onClick={() => { setSelectedOrderDetail(o); setActiveTab('orders-list'); setShowNotifications(false); }} className="p-3 hover:bg-[#cbd5e1]/10 cursor-pointer">
                        <p className="font-bold text-[#1a1a1a]">New order {o.orderId}</p>
                        <p className="text-[10px] text-[#5c5c5c] mt-0.5">Customer: {o.customer?.name} · Total: ${o.total}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User profile / Store Switch dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowStoreDropdown(prev => !prev); setShowNotifications(false); }}
              className="flex items-center gap-2 cursor-pointer hover:bg-[#303030] px-2.5 py-1.5 rounded transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-[#164475] text-white font-bold text-xs flex items-center justify-center shadow-inner">
                AC
              </div>
              <span className="text-white text-xs font-bold hidden md:block">
                Adamjee Admin
              </span>
            </button>
            {showStoreDropdown && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded border border-[#cbd5e1] shadow-2xl z-50 overflow-hidden text-xs text-left">
                <div className="px-3 py-2.5 border-b border-[#cbd5e1] bg-[#f6f6f7]">
                  <p className="font-bold text-[#1a1a1a]">Adamjee Computers</p>
                  <p className="text-[10px] text-[#5c5c5c]">support@adamjee.com</p>
                </div>
                <div className="p-1">
                  <button onClick={() => { setActiveTab('settings'); setShowStoreDropdown(false); }} className="w-full text-left px-2.5 py-2 font-bold hover:bg-[#cbd5e1]/20 rounded flex items-center gap-2"><Settings className="w-3.5 h-3.5" /> Settings</button>
                  <button onClick={() => { setActiveTab('online-store'); setShowStoreDropdown(false); }} className="w-full text-left px-2.5 py-2 font-bold hover:bg-[#cbd5e1]/20 rounded flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> View online store</button>
                  <button onClick={handleLogout} className="w-full text-left px-2.5 py-2 font-bold hover:bg-[#cbd5e1]/20 text-red-600 rounded flex items-center gap-2"><LogOut className="w-3.5 h-3.5" /> Logout</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── MOBILE SIDEBAR BACKDROP ─── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── SHOPIFY-STYLE LIGHT SIDEBAR ─── */}
      <aside className={`w-60 bg-[#f3f3f3] border-r border-[#cbd5e1] flex flex-col fixed top-12 left-0 h-[calc(100vh-48px)] z-40 select-none transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Navigation list */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-3">
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {group.title && (
                <p className="px-3 text-[10px] font-bold text-[#5c5c5c] uppercase tracking-wider mb-1">{group.title}</p>
              )}
              {group.items.map(item => {
                const isActive = activeTab === item.id || 
                  (item.subItems && item.subItems.some(sub => activeTab === sub.id));
                const isExpanded = expandedMenus[item.id];
                
                return (
                  <div key={item.id} className="space-y-0.5">
                    <button
                      onClick={() => {
                        if (item.subItems) {
                          setExpandedMenus(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                        }
                        setActiveTab(item.subItems ? item.subItems[0].id : item.id);
                        setShowCreateOrderView(false);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-left ${
                        isActive 
                          ? 'bg-[#e4e4e4] text-[#1a1a1a] shadow-sm font-black' 
                          : 'text-[#5c5c5c] hover:bg-[#e8e8e8] hover:text-[#1a1a1a]'
                      }`}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0 text-inherit" />
                      <span className="flex-1">{item.label}</span>
                      
                      {item.id === 'orders' && orders.filter(o => o.orderStatus === 'pending' || o.orderStatus === 'processing').length > 0 && (
                        <span className="bg-[#164475] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                          {orders.filter(o => o.orderStatus === 'pending' || o.orderStatus === 'processing').length}
                        </span>
                      )}
                      {item.subItems && (
                        <ChevronDown className={`w-3 h-3 text-inherit transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      )}
                    </button>

                    {item.subItems && isExpanded && (
                      <div className="pl-8 pr-1 space-y-0.5">
                        {item.subItems.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => {
                              setActiveTab(sub.id);
                              setShowCreateOrderView(false);
                              setSidebarOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1 rounded text-xs font-semibold ${
                              activeTab === sub.id
                                ? 'text-[#1a1a1a] font-bold bg-[#cbd5e1]/40'
                                : 'text-[#5c5c5c] hover:text-[#1a1a1a] hover:bg-[#cbd5e1]/20'
                            }`}
                          >
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Menu Items */}
        <div className="p-2 border-t border-[#cbd5e1] space-y-1">
          <button onClick={() => { setActiveTab('settings'); setShowCreateOrderView(false); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-bold ${
              activeTab === 'settings' ? 'bg-[#cbd5e1]/40 text-[#1a1a1a]' : 'text-[#5c5c5c] hover:bg-[#cbd5e1]/20'
            }`}>
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>
      </aside>

      {/* ─── SHOPIFY PAGE CONTAINER ─── */}
      <div className="flex-1 lg:ml-60 pt-12 flex flex-col min-h-screen">

        {/* Main Content Area */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {dbStatus === 'mock' && (
            <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg text-xs text-amber-800 shadow-sm space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>⚠️ Local Mock Database Fallback Mode Active</span>
              </div>
              <p className="leading-relaxed">
                The application could not establish a connection to your MongoDB instance. Currently, it is running in local memory fallback mode. <strong>Any changes you make (adding products, placing orders, updating status) will disappear</strong> when the Vercel serverless container restarts or goes idle.
              </p>
              <div className="text-[11px] font-semibold text-amber-900 bg-amber-100/50 p-2.5 rounded border border-amber-200 mt-2 space-y-1">
                <p><strong>To resolve this:</strong></p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Check that your <code>MONGO_URI</code> (or <code>MONGODB_URI</code>) environment variable is set correctly in Vercel.</li>
                  <li>In MongoDB Atlas, make sure you have allowed access from anywhere (IP address <code>0.0.0.0/0</code> whitelisted in the Network Access tab).</li>
                </ol>
              </div>
            </div>
          )}

          {dbStatus === 'live' && (
            <div className="p-2 px-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg text-[11px] text-emerald-800 font-semibold flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <span>Connected to MongoDB (Data is saving permanently)</span>
              </div>
              <span className="text-[10px] text-emerald-600">Database Live</span>
            </div>
          )}

          {/* Create Order view trigger screen overrides standard tabs */}
          {showCreateOrderView ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#cbd5e1] pb-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowCreateOrderView(false)} className="text-xs font-bold text-[#164475] hover:underline">← Back</button>
                  <h1 className="text-xl font-bold">Create order</h1>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSaveCreateOrder('draft')} className="px-4 py-1.5 border border-[#cbd5e1] rounded text-xs font-bold bg-white text-[#5c5c5c] hover:bg-[#f6f6f7]">Save as draft</button>
                  <button onClick={() => handleSaveCreateOrder('paid')} className="px-4 py-1.5 bg-[#164475] text-white rounded text-xs font-bold hover:bg-[#10355c]">Collect payment</button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Products card */}
                  <div className="bg-white p-5 rounded-lg border border-[#ebebeb] shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold">Products</h3>
                      <button onClick={() => setCoItems([...coItems, { productId: '', quantity: 1, price: 0 }])} className="text-xs font-semibold text-[#164475] hover:underline">Add custom item</button>
                    </div>
                    
                    <div className="space-y-3">
                      {coItems.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-center bg-[#f6f6f7] p-3 rounded border border-[#ebebeb]">
                          <select
                            value={item.productId}
                            onChange={e => {
                              const val = e.target.value;
                              const prod = products.find(p => p._id === val || p.id === val);
                              const copy = [...coItems];
                              copy[idx] = { productId: val, quantity: item.quantity, price: prod ? prod.price : 0 };
                              setCoItems(copy);
                            }}
                            className="flex-1 px-3 py-1.5 border border-[#cbd5e1] rounded text-xs bg-white"
                          >
                            <option value="">Select product...</option>
                            {products.map(p => (
                              <option key={p._id || p.id} value={p._id || p.id}>{p.name} (${p.price})</option>
                            ))}
                          </select>
                          <div className="w-16">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={e => {
                                const copy = [...coItems];
                                copy[idx].quantity = +e.target.value;
                                setCoItems(copy);
                              }}
                              className="w-full text-center px-2 py-1 border border-[#cbd5e1] rounded text-xs"
                            />
                          </div>
                          <span className="text-xs font-bold text-[#1a1a1a] w-16 text-right">${(item.price * item.quantity).toFixed(2)}</span>
                          <button
                            onClick={() => {
                              setCoItems(coItems.filter((_, i) => i !== idx));
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Details Card */}
                  <div className="bg-white p-5 rounded-lg border border-[#ebebeb] shadow-sm space-y-4">
                    <h3 className="text-sm font-bold">Payment Method</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'cod', label: 'Cash on Delivery (COD)' },
                        { id: 'card', label: 'Credit Card / Safepay' },
                        { id: 'bank', label: 'Bank Transfer' }
                      ].map(p => (
                        <button
                          key={p.id}
                          onClick={() => setCoPaymentMethod(p.id)}
                          className={`p-3 border rounded text-xs font-bold transition-all text-center ${
                            coPaymentMethod === p.id 
                              ? 'border-[#164475] bg-[#f0f7ff] text-[#164475]' 
                              : 'border-[#cbd5e1] bg-white text-[#5c5c5c] hover:bg-[#f6f6f7]'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="bg-white p-5 rounded-lg border border-[#ebebeb] shadow-sm">
                    <label className="block text-xs font-bold mb-1">Notes</label>
                    <textarea
                      value={coNotes}
                      onChange={e => setCoNotes(e.target.value)}
                      rows={2}
                      className="w-full border border-[#cbd5e1] rounded text-xs p-2 focus:outline-none focus:border-[#164475] resize-none"
                      placeholder="Add notes for this order..."
                    />
                  </div>
                </div>

                {/* Right Side: Customer search and Totals */}
                <div className="space-y-6">
                  {/* Customer Card */}
                  <div className="bg-white p-5 rounded-lg border border-[#ebebeb] shadow-sm space-y-4">
                    <h3 className="text-sm font-bold">Customer</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-[#5c5c5c] mb-1">Select existing customer profile</label>
                        <select
                          onChange={e => {
                            const val = e.target.value;
                            const matched = users.find(u => u.email === val || u._id === val);
                            if (matched) {
                              setCoCustomerName(matched.name);
                              setCoCustomerEmail(matched.email);
                              setCoCustomerPhone(matched.phone || '');
                              setCoCustomerAddress(matched.addresses?.[0]?.street || '');
                            }
                          }}
                          className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded text-xs bg-white"
                        >
                          <option value="">-- Choose Customer --</option>
                          {users.map(u => (
                            <option key={u._id} value={u.email}>{u.name} ({u.email})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#5c5c5c] mb-0.5">Customer Name</label>
                        <input type="text" value={coCustomerName} onChange={e => setCoCustomerName(e.target.value)} className="w-full border border-[#cbd5e1] rounded text-xs px-2.5 py-1" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#5c5c5c] mb-0.5">Email</label>
                        <input type="email" value={coCustomerEmail} onChange={e => setCoCustomerEmail(e.target.value)} className="w-full border border-[#cbd5e1] rounded text-xs px-2.5 py-1" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#5c5c5c] mb-0.5">Phone</label>
                        <input type="text" value={coCustomerPhone} onChange={e => setCoCustomerPhone(e.target.value)} className="w-full border border-[#cbd5e1] rounded text-xs px-2.5 py-1" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#5c5c5c] mb-0.5">Shipping Address</label>
                        <input type="text" value={coCustomerAddress} onChange={e => setCoCustomerAddress(e.target.value)} className="w-full border border-[#cbd5e1] rounded text-xs px-2.5 py-1" />
                      </div>
                    </div>
                  </div>

                  {/* Calculations card */}
                  <div className="bg-white p-5 rounded-lg border border-[#ebebeb] shadow-sm space-y-4">
                    <h3 className="text-sm font-bold">Summary</h3>
                    {(() => {
                      const subtotal = coItems.reduce((sum, item) => {
                        const prod = products.find(p => p._id === item.productId || p.id === item.productId);
                        return sum + (prod ? prod.price : 0) * item.quantity;
                      }, 0);
                      const discAmt = coDiscountType === 'fixed' ? coDiscountVal : (subtotal * coDiscountVal) / 100;
                      const taxAmt = ((subtotal - discAmt) * coTaxRate) / 100;
                      const total = subtotal - discAmt + taxAmt + coShippingCost;
                      return (
                        <div className="text-xs space-y-2.5">
                          <div className="flex justify-between text-[#5c5c5c]"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                          <div className="flex justify-between text-[#5c5c5c] items-center">
                            <span>Discount:</span>
                            <div className="flex gap-1">
                              <input type="number" value={coDiscountVal} onChange={e => setCoDiscountVal(+e.target.value)} className="w-12 text-center border rounded text-[10px]" />
                              <select value={coDiscountType} onChange={e => setCoDiscountType(e.target.value)} className="text-[10px] border rounded bg-white">
                                <option value="percentage">%</option>
                                <option value="fixed">$</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-between text-[#5c5c5c]"><span>GST Tax ({coTaxRate}%):</span><span>+${taxAmt.toFixed(2)}</span></div>
                          <div className="flex justify-between text-[#5c5c5c]"><span>Shipping:</span><span>+${coShippingCost.toFixed(2)}</span></div>
                          <div className="flex justify-between font-bold text-sm text-[#1a1a1a] pt-2 border-t border-[#ebebeb]"><span>Total:</span><span>${total.toFixed(2)}</span></div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ═══ HOME TAB ═══ */}
              {activeTab === 'home' && (
                <div className="space-y-6">
                  {/* Hero Centered Section */}
                  <div className="text-center max-w-2xl mx-auto py-6 space-y-4">
                    <h1 className="text-2xl font-black tracking-tight text-[#1a1a1a] font-sans">
                      Welcome to Adamjee Computers! Where do you want to start?
                    </h1>
                    
                    {/* AI Product Description prompt input */}
                    <div className="relative w-full max-w-lg mx-auto bg-white rounded-full border border-[#cbd5e1] p-1.5 pl-3 pr-2 flex items-center shadow-xs focus-within:shadow-md focus-within:border-purple-300 transition-all">
                      <div className="flex items-center justify-center bg-[#8f61f7] text-white w-6 h-6 rounded-full flex-shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <input 
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateDescription(); }}
                        placeholder={aiGenerating ? "Generating description..." : "Write a product description with Gemini AI..."}
                        disabled={aiGenerating}
                        className="flex-1 text-xs px-2.5 outline-none text-[#1a1a1a] bg-transparent"
                      />
                      <button onClick={handleGenerateDescription} disabled={aiGenerating} className="bg-[#1a1a1a] text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-[#303030] transition-colors flex-shrink-0 cursor-pointer disabled:opacity-40">
                        <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                      </button>
                    </div>

                    {aiGeneratedText && (
                      <div className="max-w-lg mx-auto p-4 bg-purple-50 border border-purple-200 rounded-xl text-left text-xs text-[#1a1a1a] shadow-xs relative animate-fade-in space-y-2">
                        <p className="font-bold text-purple-800 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" /> Generated Product Description:
                        </p>
                        <p className="leading-relaxed select-text font-medium">{aiGeneratedText}</p>
                        <button onClick={() => setAiGeneratedText('')} className="absolute top-2 right-2 p-1 text-purple-400 hover:text-purple-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Setup Guide Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto bg-white border border-[#cbd5e1] rounded-xl p-6 shadow-xs">
                    <div className="space-y-3">
                      <h2 className="text-sm font-bold flex items-center gap-1.5 text-[#1a1a1a]">
                        <Sparkles className="w-4 h-4 text-[#8f61f7]" /> Store Setup Checklist
                      </h2>
                      <p className="text-xs text-[#5c5c5c]">Configure these essential setup steps to activate all online capabilities and finalize your digital storefront.</p>
                      <div className="space-y-2.5 pt-1 text-xs">
                        {setupSteps.map(step => (
                          <div key={step.id} className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={step.completed}
                              onChange={() => {
                                setSetupSteps(setupSteps.map(s => s.id === step.id ? { ...s, completed: !s.completed } : s));
                              }}
                              className="w-4 h-4 text-[#164475] rounded border-gray-300 focus:ring-[#164475] cursor-pointer"
                            />
                            <span className={step.completed ? 'line-through text-gray-400 font-medium' : 'text-[#1a1a1a] font-semibold'}>{step.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center bg-[#f8fafc] border border-[#e2e8f0] p-6 rounded-xl text-center space-y-3">
                      <p className="text-xs text-[#5c5c5c] font-bold">Progress Completed</p>
                      <div className="text-4xl font-black text-[#164475] font-sans">
                        {Math.round((setupSteps.filter(s => s.completed).length / setupSteps.length) * 100)}%
                      </div>
                      <div className="w-full bg-[#e2e8f0] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#164475] h-full transition-all duration-300" style={{ width: `${(setupSteps.filter(s => s.completed).length / setupSteps.length) * 100}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Core Metrics */}
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Revenue', value: `$${stats?.revenue?.total?.toLocaleString() ?? '1,890.00'}`, growth: '+12%', icon: TrendingUp },
                      { label: 'Total Orders', value: stats?.orders?.total ?? orders.length, growth: '+5%', icon: Package },
                      { label: 'Total Products', value: products.length, growth: '0%', icon: ShoppingBag },
                      { label: 'Unread inbox sessions', value: chatSessions.length, growth: '', icon: Mail },
                    ].map(({ label, value, growth, icon: Icon }) => (
                      <div key={label} className="bg-white rounded-lg p-5 border border-[#ebebeb] shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-[#5c5c5c]">{label}</span>
                          <Icon className="w-4 h-4 text-[#5c5c5c]" />
                        </div>
                        <div className="text-xl font-bold text-[#1a1a1a]">{value}</div>
                        {growth && (
                          <div className="text-[10px] text-green-600 font-bold mt-1">
                            {growth} compared to last week
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Main Grid: Orders & Stock Alert */}
                  <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-lg border border-[#ebebeb] shadow-sm p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="font-bold text-sm text-[#1a1a1a]">Recent orders list</h2>
                        <button onClick={() => setActiveTab('orders-list')} className="text-xs font-bold text-[#164475] hover:underline">View all orders</button>
                      </div>
                      
                      <div className="divide-y divide-[#ebebeb]">
                        {orders.slice(0, 5).map(o => (
                          <div key={o._id} className="flex items-center justify-between py-2 text-xs">
                            <div>
                              <p className="font-bold text-[#164475] font-mono">{o.orderId}</p>
                              <p className="text-[#5c5c5c] mt-0.5">{o.user?.name || o.guestEmail || 'Guest'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-[#1a1a1a]">${o.total?.toLocaleString()}</p>
                              <div className="flex gap-1 mt-0.5">
                                <StatusBadge s={o.orderStatus} />
                                <StatusBadge s={o.paymentStatus} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-[#ebebeb] shadow-sm p-6 space-y-4">
                      <h2 className="font-bold text-sm text-[#1a1a1a]">Inventory warning highlights</h2>
                      <div className="space-y-3">
                        {products.filter(p => getInventoryStatus(p.stock || 0, p.lowStockThreshold || 5) !== 'in stock').slice(0, 4).map(p => (
                          <div key={p._id} className="flex items-center gap-3 bg-[#f6f6f7] p-2 rounded border border-[#ebebeb] text-xs">
                            <img src={p.image} alt={p.name} className="w-8 h-8 object-contain bg-white rounded border border-[#cbd5e1] p-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate text-[#1a1a1a]">{p.name}</p>
                              <p className="text-[10px] text-[#5c5c5c]">{p.stock} units left</p>
                            </div>
                            <StatusBadge s={getInventoryStatus(p.stock || 0, p.lowStockThreshold || 5)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ ORDERS TABS ═══ */}
              {(activeTab === 'orders-list' || activeTab === 'drafts' || activeTab === 'abandoned-checkouts') && (
                <div className="space-y-4">
                  {/* Shopify page header */}
                  <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold capitalize">
                      {activeTab === 'orders-list' ? 'Orders' : activeTab === 'drafts' ? 'Drafts' : 'Abandoned checkouts'}
                    </h1>
                    <div className="flex gap-2">
                      <button
                        onClick={() => exportCSV(filteredOrders, `${activeTab}.csv`, [
                          { key: 'orderId', label: 'Order' }, { key: 'user.name', label: 'Customer' },
                          { key: 'total', label: 'Total' }, { key: 'orderStatus', label: 'Fulfillment Status' },
                          { key: 'paymentStatus', label: 'Payment Status' }
                        ])}
                        className="px-3 py-1.5 border border-[#cbd5e1] rounded text-xs font-bold bg-white text-[#5c5c5c] hover:bg-[#f6f6f7]"
                      >
                        Export
                      </button>
                      <button
                        onClick={() => setShowCreateOrderView(true)}
                        className="px-4 py-1.5 bg-[#164475] text-white rounded text-xs font-bold hover:bg-[#10355c] shadow-sm"
                      >
                        Create order
                      </button>
                    </div>
                  </div>

                  {/* Shopify Filters Tab Header */}
                  <div className="bg-white rounded-lg border border-[#ebebeb] shadow-sm overflow-hidden">
                    {activeTab === 'orders-list' && (
                      <div className="flex border-b border-[#ebebeb] overflow-x-auto">
                        {['All', 'Unfulfilled', 'Unpaid', 'Open', 'Closed'].map(tab => (
                          <button
                            key={tab}
                            onClick={() => setOrderTabFilter(tab)}
                            className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-all ${
                              orderTabFilter === tab 
                                ? 'border-[#164475] text-[#164475]' 
                                : 'border-transparent text-[#5c5c5c] hover:text-[#1a1a1a]'
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Filter and Actions Bar */}
                    <div className="p-3 border-b border-[#ebebeb] flex gap-2 flex-wrap items-center">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5c5c5c]" />
                        <input
                          value={searchQ}
                          onChange={e => setSearchQ(e.target.value)}
                          placeholder="Filter orders..."
                          className="w-full pl-8 pr-3 py-1 border border-[#cbd5e1] rounded text-xs focus:outline-none focus:border-[#164475]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 border border-[#cbd5e1] rounded text-xs font-semibold bg-white text-[#5c5c5c] hover:bg-[#f6f6f7]">Filter</button>
                        <button className="px-3 py-1 border border-[#cbd5e1] rounded text-xs font-semibold bg-white text-[#5c5c5c] hover:bg-[#f6f6f7]">Columns</button>
                        <button className="px-3 py-1 border border-[#cbd5e1] rounded text-xs font-semibold bg-white text-[#5c5c5c] hover:bg-[#f6f6f7]">Sort</button>
                      </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#fafafa] border-b border-[#ebebeb] text-[#5c5c5c] font-bold">
                          <tr>
                            <th className="px-5 py-3 w-10"><input type="checkbox" className="rounded text-[#164475]" /></th>
                            <th className="px-5 py-3">Order</th>
                            <th className="px-5 py-3">Date</th>
                            <th className="px-5 py-3">Customer</th>
                            <th className="px-5 py-3">Channel</th>
                            <th className="px-5 py-3 text-right">Total</th>
                            <th className="px-5 py-3">Payment status</th>
                            <th className="px-5 py-3">Fulfillment status</th>
                            <th className="px-5 py-3">Items</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ebebeb]">
                          {filteredOrders.length === 0 && (
                            <tr><td colSpan={9} className="px-5 py-8 text-center text-gray-400 font-semibold">No orders found.</td></tr>
                          )}
                          {pagedOrders.map(o => (
                            <tr key={o._id} onClick={() => setSelectedOrderDetail(o)} className="hover:bg-[#f6f6f7] cursor-pointer transition-colors">
                              <td className="px-5 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" className="rounded text-[#164475]" /></td>
                              <td className="px-5 py-3 font-bold text-[#164475] flex items-center gap-1 font-mono">
                                {o.orderStatus === 'abandoned' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                                {o.orderId}
                              </td>
                              <td className="px-5 py-3 text-[#5c5c5c]">{new Date(o.createdAt).toLocaleDateString()}</td>
                              <td className="px-5 py-3 font-semibold">{o.user?.name || o.guestEmail || 'Guest'}</td>
                              <td className="px-5 py-3 text-[#5c5c5c]">Online Store</td>
                              <td className="px-5 py-3 font-bold text-right">${o.total?.toFixed(2)}</td>
                              <td className="px-5 py-3"><StatusBadge s={o.paymentStatus || 'pending'} /></td>
                              <td className="px-5 py-3"><StatusBadge s={o.orderStatus} /></td>
                              <td className="px-5 py-3 text-[#5c5c5c] font-semibold">{o.items?.length || 1} item{o.items?.length > 1 ? 's' : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <PaginationBar page={ordPage} totalPages={ordTotalPages} setPage={setOrdPage} total={filteredOrders.length} />
                  </div>
                </div>
              )}

              {/* ═══ PRODUCTS TAB ═══ */}
              {(activeTab === 'products-list' || activeTab === 'inventory' || activeTab === 'collections') && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold">
                      {activeTab === 'products-list' ? 'Products' : activeTab === 'inventory' ? 'Inventory' : 'Collections'}
                    </h1>
                    <div className="flex gap-2">
                      {activeTab === 'products-list' && (
                        <button onClick={() => { setEditingProduct(null); setShowProductForm(true); }}
                          className="px-4 py-1.5 bg-[#164475] text-white rounded text-xs font-bold hover:bg-[#10355c] shadow-sm">
                          Add product
                        </button>
                      )}
                    </div>
                  </div>

                  {activeTab === 'products-list' && (
                    <div className="bg-white rounded-lg border border-[#ebebeb] shadow-sm overflow-hidden">
                      <div className="p-3 border-b border-[#ebebeb] flex gap-2 flex-wrap items-center">
                        <div className="relative flex-1 min-w-[200px]">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5c5c5c]" />
                          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Filter products..."
                            className="w-full pl-8 pr-3 py-1 border border-[#cbd5e1] rounded text-xs focus:outline-none" />
                        </div>
                        <select value={productCategoryFilter} onChange={e => setProductCategoryFilter(e.target.value)}
                          className="px-3 py-1 border border-[#cbd5e1] bg-white rounded text-xs">
                          {productCategories.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#fafafa] border-b border-[#ebebeb] text-[#5c5c5c] font-bold">
                            <tr>
                              <th className="px-5 py-3 w-10"><input type="checkbox" className="rounded text-[#164475]" /></th>
                              <SortTh label="Product" field="name" sortField={productSortField} sortDir={productSortDir} onSort={handleProductSort} />
                              <th className="px-5 py-3">SKU</th>
                              <SortTh label="Category" field="category" sortField={productSortField} sortDir={productSortDir} onSort={handleProductSort} />
                              <SortTh label="Price" field="price" sortField={productSortField} sortDir={productSortDir} onSort={handleProductSort} />
                              <SortTh label="Stock" field="stock" sortField={productSortField} sortDir={productSortDir} onSort={handleProductSort} />
                              <th className="px-5 py-3">Status</th>
                              <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#ebebeb]">
                            {pagedProducts.map(p => {
                              const status = getInventoryStatus(p.stock || 0, p.lowStockThreshold || 5);
                              return (
                                <tr key={p._id} className="hover:bg-[#f6f6f7] transition-colors cursor-pointer" onClick={() => setSelectedProductDetail(p)}>
                                  <td className="px-5 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" className="rounded text-[#164475]" /></td>
                                  <td className="px-5 py-3 font-semibold">
                                    <div className="flex items-center gap-3">
                                      <img src={p.image} alt={p.name} className="w-10 h-10 object-contain bg-[#f6f6f7] rounded border border-[#cbd5e1] p-0.5" />
                                      <div>
                                        <p className="font-bold text-[#1a1a1a] line-clamp-1 max-w-[180px]">{p.name}</p>
                                        <p className="text-[10px] text-[#5c5c5c]">{p.vendor}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3 font-mono text-[#5c5c5c]">{p.code}</td>
                                  <td className="px-5 py-3 text-[#5c5c5c]">{p.category}</td>
                                  <td className="px-5 py-3 font-bold">${p.price}</td>
                                  <td className="px-5 py-3 font-semibold"><StatusBadge s={status} /> ({p.stock} units)</td>
                                  <td className="px-5 py-3"><StatusBadge s={p.status || 'active'} /></td>
                                  <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                                    <div className="flex gap-1.5 justify-end">
                                      <button onClick={() => { setEditingProduct(p); setShowProductForm(true); }} className="p-1 border rounded bg-white text-[#164475] hover:bg-[#f0f7ff]" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => handleDeleteProduct(p._id)} className="p-1 border rounded bg-white text-red-500 hover:bg-red-50" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <PaginationBar page={prodPage} totalPages={prodTotalPages} setPage={setProdPage} total={filteredProducts.length} />
                    </div>
                  )}

                  {activeTab === 'inventory' && (
                    <div className="bg-white rounded-lg border border-[#ebebeb] shadow-sm overflow-hidden">
                      <div className="p-3 border-b border-[#ebebeb] flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5c5c5c]" />
                          <input value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} placeholder="Filter inventory..."
                            className="w-full pl-8 pr-3 py-1 border border-[#cbd5e1] rounded text-xs focus:outline-none" />
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#fafafa] border-b border-[#ebebeb] text-[#5c5c5c]">
                            <tr>
                              <th className="px-5 py-3">Product</th>
                              <th className="px-5 py-3">SKU</th>
                              <th className="px-5 py-3 text-right">Available</th>
                              <th className="px-5 py-3 text-right">Low Stock Alert</th>
                              <th className="px-5 py-3 text-right">Cost Price</th>
                              <th className="px-5 py-3 text-right font-bold text-[#1a1a1a]">Stock Value</th>
                              <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#ebebeb]">
                            {pagedInventory.map(p => (
                              <tr key={p._id} className="hover:bg-[#f6f6f7] transition-colors cursor-pointer" onClick={() => setInventoryDetailProduct(p)}>
                                <td className="px-5 py-3 font-bold">{p.name}</td>
                                <td className="px-5 py-3 font-mono text-[#5c5c5c]">{p.code}</td>
                                <td className="px-5 py-3 text-right font-bold">{p.stock} units</td>
                                <td className="px-5 py-3 text-right text-amber-600 font-semibold">{p.lowStockThreshold || 5} units</td>
                                <td className="px-5 py-3 text-right text-[#5c5c5c]">${p.costPerItem || 0}</td>
                                <td className="px-5 py-3 text-right font-bold text-[#164475]">${((p.stock || 0) * (p.costPerItem || 0)).toLocaleString()}</td>
                                <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => setStockAdjustProduct(p)} className="px-3 py-1 bg-[#164475]/10 hover:bg-[#164475]/20 text-[#164475] font-bold rounded text-[10px]">
                                    Adjust stock
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <PaginationBar page={invPageNum} totalPages={invTotalPages} setPage={setInvPage} total={filteredInventory.length} />
                    </div>
                  )}

                  {activeTab === 'collections' && (
                    <div className="bg-white p-6 rounded-lg border border-[#ebebeb] shadow-sm space-y-4">
                      <h3 className="text-sm font-bold">Categories / Collections</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {productCategories.filter(c => c !== 'All').map(c => (
                          <div key={c} className="p-4 border border-[#cbd5e1] rounded bg-[#f6f6f7] text-center font-bold text-xs shadow-sm hover:border-[#164475] transition-colors">
                            {c}
                            <p className="text-[10px] text-[#5c5c5c] font-semibold mt-1">
                              {products.filter(p => p.category === c).length} products
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ CUSTOMERS TAB ═══ */}
              {activeTab === 'customers' && (
                <div className="space-y-4">
                  <h1 className="text-xl font-bold">Customers</h1>
                  <div className="bg-white rounded-lg border border-[#ebebeb] shadow-sm overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#fafafa] border-b border-[#ebebeb] text-[#5c5c5c] font-bold">
                        <tr>
                          <th className="px-5 py-3">Customer name</th>
                          <th className="px-5 py-3">Email</th>
                          <th className="px-5 py-3 text-center">Orders</th>
                          <th className="px-5 py-3 text-right">Total Spent</th>
                          <th className="px-5 py-3">Segment / Tags</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ebebeb]">
                        {pagedUsers.map(u => {
                          const spendData = customerSpendings[u.email] || { totalSpent: 0, orderCount: 0 };
                          return (
                            <tr key={u._id} onClick={() => setSelectedCustomerDetail({ ...u, ...spendData })} className="hover:bg-[#f6f6f7] cursor-pointer transition-colors">
                              <td className="px-5 py-3 font-bold">{u.name}</td>
                              <td className="px-5 py-3 text-[#5c5c5c]">{u.email}</td>
                              <td className="px-5 py-3 text-center font-semibold">{spendData.orderCount}</td>
                              <td className="px-5 py-3 text-right font-extrabold text-[#164475]">${spendData.totalSpent.toFixed(2)}</td>
                              <td className="px-5 py-3">
                                {spendData.totalSpent > 1000 ? (
                                  <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-200">High-Value Customer</span>
                                ) : spendData.orderCount > 0 ? (
                                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">Returning Customer</span>
                                ) : (
                                  <span className="bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded border border-gray-200">Lead</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <PaginationBar page={usersPage} totalPages={usersTotalPages} setPage={setUsersPage} total={users.length} />
                  </div>
                </div>
              )}

              {/* ═══ CONTENT (BLOGS & PAGES) ═══ */}
              {(activeTab === 'blogs' || activeTab === 'pages') && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold">{activeTab === 'blogs' ? 'Blog Posts' : 'Store Pages'}</h1>
                    <button
                      onClick={() => {
                        if (activeTab === 'blogs') {
                          setEditingBlog(null);
                          setBlogTitle(''); setBlogContent(''); setBlogImage(''); setBlogExcerpt(''); setBlogIsPublished(true);
                          setShowBlogForm(true);
                        } else {
                          alert('Standard Pages are loaded directly from theme. To modify custom pages, edit layout templates.');
                        }
                      }}
                      className="px-4 py-1.5 bg-[#164475] text-white rounded text-xs font-bold hover:bg-[#10355c]"
                    >
                      {activeTab === 'blogs' ? 'Create blog post' : 'Add page'}
                    </button>
                  </div>

                  {showBlogForm && (
                    <form onSubmit={handleSaveBlog} className="bg-white p-6 rounded-lg border border-[#cbd5e1] shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="font-bold text-sm">{editingBlog?._id ? 'Edit blog post' : 'New blog post'}</h3>
                        <button type="button" onClick={() => setShowBlogForm(false)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold mb-1">Title</label>
                          <input type="text" value={blogTitle} onChange={e => setBlogTitle(e.target.value)} required
                            className="w-full px-3 py-1.5 border rounded text-xs focus:outline-none focus:border-[#164475]" placeholder="Post title" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold mb-1">Category</label>
                          <input type="text" value={blogCategory} onChange={e => setBlogCategory(e.target.value)}
                            className="w-full px-3 py-1.5 border rounded text-xs focus:outline-none focus:border-[#164475]" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-bold mb-1">Cover Image</label>
                        <div className="flex gap-2">
                          <input type="url" value={blogImage} onChange={e => setBlogImage(e.target.value)}
                            className="flex-1 px-3 py-1.5 border rounded text-xs focus:outline-none focus:border-[#164475]" placeholder="https://example.com/image.jpg or select file" />
                          <label className="px-3 py-1.5 bg-[#164475] hover:bg-[#10355c] text-white rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 select-none">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload File</span>
                            <input type="file" accept="image/*" className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                
                                // Show immediate local base64 preview while uploading (or as fallback)
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setBlogImage(reader.result as string);
                                };
                                reader.readAsDataURL(file);

                                // Upload to server upload endpoint
                                const formData = new FormData();
                                formData.append('image', file);
                                try {
                                  const res = await fetch('/api/upload', {
                                    method: 'POST',
                                    body: formData,
                                  });
                                  const data = await res.json();
                                  if (data.success && data.image) {
                                    setBlogImage(data.image); // Set to server url
                                  }
                                } catch (err) {
                                  console.error('Server upload failed, using base64 fallback:', err);
                                }
                              }}
                            />
                          </label>
                        </div>
                        {blogImage && (
                          <div className="relative group mt-2 h-24 w-full rounded border border-[#cbd5e1] overflow-hidden bg-gray-50 flex items-center justify-center">
                            <img src={blogImage} alt="Preview" className="max-h-full max-w-full object-contain" />
                            <button type="button" onClick={() => setBlogImage('')}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md border-none cursor-pointer">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Excerpt</label>
                        <input type="text" value={blogExcerpt} onChange={e => setBlogExcerpt(e.target.value)}
                          className="w-full px-3 py-1.5 border rounded text-xs focus:outline-none" placeholder="A brief summary for previews..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Content</label>
                        <textarea value={blogContent} onChange={e => setBlogContent(e.target.value)} rows={8}
                          className="w-full px-3 py-2 border rounded text-xs focus:outline-none resize-none focus:border-[#164475]" placeholder="Write content here..." />
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                          <input type="checkbox" checked={blogIsPublished} onChange={e => setBlogIsPublished(e.target.checked)} className="rounded text-[#164475]" />
                          Publish immediately
                        </label>
                      </div>
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <button type="button" onClick={() => setShowBlogForm(false)} className="px-3 py-1.5 border rounded text-xs font-bold hover:bg-slate-50">Cancel</button>
                        <button type="submit" className="px-4 py-1.5 bg-[#164475] text-white rounded text-xs font-bold hover:bg-[#10355c]">Save post</button>
                      </div>
                    </form>
                  )}

                  {activeTab === 'blogs' && !showBlogForm && (
                    <div className="bg-white rounded-lg border border-[#ebebeb] shadow-sm overflow-hidden">
                      <div className="divide-y divide-[#ebebeb]">
                        {blogs.length === 0 && <div className="p-8 text-center text-[#5c5c5c] font-bold">No blog posts found.</div>}
                        {blogs.map(post => (
                          <div key={post._id} className="p-5 hover:bg-[#fafafa] flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <h3 className="font-bold text-sm text-[#1a1a1a]">{post.title}</h3>
                              <p className="text-xs text-[#5c5c5c]">Category: <span className="font-semibold">{post.category}</span> • Published: <span className="font-semibold">{new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</span></p>
                              <p className="text-xs text-gray-600 italic line-clamp-1">{post.excerpt || 'No summary available.'}</p>
                            </div>
                            <div className="flex gap-1.5 flex-shrink-0">
                              <button onClick={() => {
                                setEditingBlog(post);
                                setBlogTitle(post.title); setBlogContent(post.content); setBlogCategory(post.category); setBlogExcerpt(post.excerpt || ''); setBlogIsPublished(post.isPublished); setBlogImage(post.image || '');
                                setShowBlogForm(true);
                              }} className="px-2.5 py-1 border rounded text-[10px] bg-white font-bold text-[#164475] hover:bg-[#f0f7ff]">Edit</button>
                              <button onClick={() => handleDeleteBlog(post._id)} className="px-2.5 py-1 border rounded text-[10px] bg-white font-bold text-red-600 hover:bg-red-50">Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'pages' && (
                    <div className="bg-white rounded-lg border border-[#ebebeb] shadow-sm overflow-hidden p-6 space-y-4">
                      <h3 className="text-sm font-bold text-[#1a1a1a]">Storefront Custom Pages</h3>
                      <p className="text-xs text-[#5c5c5c]">Here are the current core templates deployed in the next application:</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        {['About Us Page', 'FAQ & Help', 'Contact Us Form', 'Build Your PC Template', 'Privacy & Terms'].map(p => (
                          <div key={p} className="p-4 border rounded bg-[#fafafa] font-bold flex justify-between items-center shadow-sm">
                            <span>{p}</span>
                            <span className="text-[10px] font-bold bg-[#f0f7ff] text-[#164475] px-2 py-0.5 rounded border border-[#164475]/30">ACTIVE</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ ANALYTICS TABS ═══ */}
              {activeTab === 'analytics' && (() => {
                const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
                const totalOrders = orders.length;
                const fulfilledOrders = orders.filter(o => o.fulfillmentStatus === 'fulfilled' || o.orderStatus === 'delivered' || o.orderStatus === 'completed').length;
                
                // Return rate calculation
                const customerOrderCounts = orders.reduce((acc: any, o) => {
                  const email = o.user?.email || o.guestEmail || '';
                  if (email) acc[email] = (acc[email] || 0) + 1;
                  return acc;
                }, {});
                const totalCustomers = Object.keys(customerOrderCounts).length;
                const repeatCustomers = Object.values(customerOrderCounts).filter((c: any) => c > 1).length;
                const returningCustomerRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

                return (
                  <div className="space-y-6 text-left pb-10 select-none">
                    {/* Top filter bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cbd5e1] pb-3 bg-white p-4 rounded-lg shadow-xs">
                      <div>
                        <h1 className="text-lg font-black text-[#1a1a1a]">Analytics</h1>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Last refreshed: Just now</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#5c5c5c]">
                        <button className="px-3 py-1.5 border border-[#cbd5e1] rounded-lg bg-white hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer">
                          <span>Today</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button className="px-3 py-1.5 border border-[#cbd5e1] rounded-lg bg-white hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer">
                          <span>Jan 8, 2026</span>
                        </button>
                        <span className="text-gray-300">|</span>
                        <span className="text-[11px] text-gray-400">vs PKR 0 (comparison)</span>
                      </div>
                    </div>

                    {/* KPI Sparkline row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Online store sales', value: `PKR ${totalRevenue.toLocaleString()}` },
                        { label: 'Returning customer rate', value: `${returningCustomerRate}%` },
                        { label: 'Orders fulfilled', value: fulfilledOrders },
                        { label: 'Orders', value: totalOrders }
                      ].map((card, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-[#cbd5e1] shadow-xs space-y-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{card.label}</p>
                          <div className="flex items-baseline justify-between">
                            <span className="text-lg font-black text-[#1a1a1a]">{card.value}</span>
                            <span className="text-[10px] font-bold text-green-600">--%</span>
                          </div>
                          {/* Tiny sparkline SVG */}
                          <div className="h-6 w-full pt-1">
                            <svg className="w-full h-full text-blue-500" viewBox="0 0 100 10" preserveAspectRatio="none">
                              <path d="M0,5 Q20,3 40,7 T80,4 T100,5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total Sales main graph card */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white border border-[#cbd5e1] rounded-xl overflow-hidden shadow-xs">
                      <div className="lg:col-span-2 p-5 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Total sales over time</h3>
                            <p className="text-2xl font-black text-[#1a1a1a] mt-1">PKR {totalRevenue.toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2 text-[10px] font-bold text-gray-400">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Jul 2 - Jul 8</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> Previous week</span>
                          </div>
                        </div>
                        {/* Line chart container */}
                        <div className="h-48 relative border-b border-[#cbd5e1] pt-4">
                          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[9px] font-semibold text-gray-300">
                            <div className="border-b border-dashed w-full pt-6">PKR {Math.round(totalRevenue || 10000)}</div>
                            <div className="border-b border-dashed w-full pt-6">PKR {Math.round((totalRevenue || 10000) / 2)}</div>
                            <div className="w-full pt-6">PKR 0</div>
                          </div>
                          {/* Live interactive path */}
                          <svg className="w-full h-full absolute inset-0 text-[#164475]" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M 0 90 L 15 85 L 30 75 L 45 40 L 60 45 L 75 25 L 90 10 L 100 10" fill="none" stroke="currentColor" strokeWidth="2.5" />
                          </svg>
                        </div>
                        <div className="flex justify-between text-[9px] font-bold text-gray-400 px-2">
                          <span>12 AM</span>
                          <span>4 AM</span>
                          <span>8 AM</span>
                          <span>12 PM</span>
                          <span>4 PM</span>
                          <span>8 PM</span>
                        </div>
                      </div>

                      {/* Right Sales Breakdown panel */}
                      <div className="bg-gray-50 border-l border-[#cbd5e1] p-5 flex flex-col justify-between">
                        <h3 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Total sales breakdown</h3>
                        <div className="space-y-2.5 text-xs font-semibold text-[#1a1a1a] pt-3">
                          <div className="flex justify-between"><span>Gross sales</span><span>PKR {totalRevenue.toLocaleString()}</span></div>
                          <div className="flex justify-between text-gray-400"><span>Discounts</span><span>PKR 0</span></div>
                          <div className="flex justify-between text-gray-400"><span>Returns</span><span>PKR 0</span></div>
                          <div className="flex justify-between border-t border-[#cbd5e1] pt-2 font-bold"><span>Net sales</span><span>PKR {totalRevenue.toLocaleString()}</span></div>
                          <div className="flex justify-between text-gray-400"><span>Shipping charges</span><span>PKR 0</span></div>
                          <div className="flex justify-between text-gray-400"><span>Return fees</span><span>PKR 0</span></div>
                          <div className="flex justify-between text-gray-400"><span>Taxes</span><span>PKR 0</span></div>
                          <div className="flex justify-between border-t-2 border-double border-[#cbd5e1] pt-2.5 font-black text-sm text-[#164475]"><span>Total sales</span><span>PKR {totalRevenue.toLocaleString()}</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Dashboard grid cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Card 1: Channel Sales */}
                      <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-xs space-y-3">
                        <h4 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Total sales by sales channel</h4>
                        <div className="h-28 flex flex-col items-center justify-center text-center text-xs text-gray-400 font-bold border border-dashed rounded-lg bg-gray-50">
                          No data for this date range
                        </div>
                      </div>

                      {/* Card 2: Average Order Value */}
                      <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-xs space-y-3">
                        <h4 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Average order value over time</h4>
                        <div className="flex items-baseline justify-between">
                          <span className="text-lg font-black text-[#1a1a1a]">PKR {totalOrders > 0 ? Math.round(totalRevenue / totalOrders).toLocaleString() : 0}</span>
                          <span className="text-[10px] font-bold text-gray-400">0%</span>
                        </div>
                        <div className="h-16 pt-2">
                          <svg className="w-full h-full text-blue-400" viewBox="0 0 100 10" preserveAspectRatio="none">
                            <path d="M0,8 L100,8" fill="none" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                        </div>
                      </div>

                      {/* Card 3: Sales by Product */}
                      <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-xs space-y-3">
                        <h4 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Total sales by product</h4>
                        <div className="h-28 flex flex-col items-center justify-center text-center text-xs text-gray-400 font-bold border border-dashed rounded-lg bg-gray-50">
                          No products sold in this range
                        </div>
                      </div>

                      {/* Card 4: Sessions over time */}
                      <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-xs space-y-3">
                        <h4 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Sessions over time</h4>
                        <div className="flex items-baseline justify-between">
                          <span className="text-lg font-black text-[#1a1a1a]">{totalOrders * 3}</span>
                          <span className="text-[10px] font-bold text-gray-400">--%</span>
                        </div>
                        <div className="h-16 pt-2">
                          <svg className="w-full h-full text-blue-400" viewBox="0 0 100 10" preserveAspectRatio="none">
                            <path d="M0,8 L20,8 L40,8 L60,8 L80,8 L100,8" fill="none" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                        </div>
                      </div>

                      {/* Card 5: Conversion rate */}
                      <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-xs space-y-3">
                        <h4 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Conversion rate over time</h4>
                        <div className="flex items-baseline justify-between">
                          <span className="text-lg font-black text-[#1a1a1a]">0.0%</span>
                          <span className="text-[10px] font-bold text-gray-400">0%</span>
                        </div>
                        <div className="h-16 pt-2">
                          <svg className="w-full h-full text-blue-400" viewBox="0 0 100 10" preserveAspectRatio="none">
                            <path d="M0,8 L100,8" fill="none" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                        </div>
                      </div>

                      {/* Card 6: Conversion breakdown */}
                      <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-xs space-y-3">
                        <h4 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Conversion rate breakdown</h4>
                        <div className="space-y-2 text-xs font-semibold text-[#1a1a1a] pt-1">
                          <div className="flex justify-between"><span>Sessions</span><span className="font-bold">{totalOrders * 3}</span></div>
                          <div className="flex justify-between text-gray-400 pl-3"><span>Added to cart</span><span>0 (0%)</span></div>
                          <div className="flex justify-between text-gray-400 pl-3"><span>Reached checkout</span><span>0 (0%)</span></div>
                          <div className="flex justify-between border-t pt-1.5"><span>Sessions converted</span><span className="font-bold">{totalOrders}</span></div>
                        </div>
                      </div>

                      {/* Card 7: Cohort Analysis Grid */}
                      <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-xs space-y-3 lg:col-span-2 overflow-x-auto">
                        <h4 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Customer cohort analysis</h4>
                        <table className="w-full text-left text-[10px] font-semibold text-[#1a1a1a] border-collapse">
                          <thead>
                            <tr className="bg-gray-50 text-gray-400 font-bold border-b">
                              <th className="p-2">Cohort</th>
                              <th className="p-2">Month 0</th>
                              <th className="p-2">Month 1</th>
                              <th className="p-2">Month 2</th>
                              <th className="p-2">Month 3</th>
                              <th className="p-2">Month 4</th>
                              <th className="p-2">Month 5</th>
                              <th className="p-2">Month 6</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {['Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026'].map((m, idx) => (
                              <tr key={m}>
                                <td className="p-2 font-bold">{m}</td>
                                {Array.from({ length: 7 }).map((_, colIdx) => (
                                  <td key={colIdx} className="p-2 text-blue-500 font-bold" style={{ opacity: colIdx + idx < 8 ? 1 : 0 }}>
                                    {colIdx + idx < 8 ? '0%' : ''}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Card 8: Sessions by Device Type */}
                      <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-xs space-y-3">
                        <h4 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Sessions by device type</h4>
                        <div className="h-28 flex flex-col items-center justify-center text-center text-xs text-gray-400 font-bold border border-dashed rounded-lg bg-gray-50">
                          No data for this date range
                        </div>
                      </div>
                    </div>

                    {/* Bottom Helper link */}
                    <div className="text-center pt-4 border-t border-[#cbd5e1]">
                      <a href="https://adamjeecomputers.pk/help" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#164475] hover:underline">Learn more about analytics →</a>
                    </div>
                  </div>
                );
              })()}

              {/* ═══ DISCOUNTS TAB ═══ */}
              {activeTab === 'discounts' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold">Discounts</h1>
                    <button
                      onClick={() => {
                        setEditingDiscount(null);
                        setDiscountCode(''); setDiscountValue(10); setDiscountMinReq(0); setDiscountUsageLimit('');
                        setShowDiscountForm(true);
                      }}
                      className="px-4 py-1.5 bg-[#164475] text-white rounded text-xs font-bold hover:bg-[#10355c]"
                    >
                      Create discount
                    </button>
                  </div>

                  {showDiscountForm && (
                    <form onSubmit={handleSaveDiscount} className="bg-white p-6 rounded-lg border border-[#cbd5e1] shadow-sm space-y-4 max-w-xl mx-auto">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="font-bold text-sm">{editingDiscount?._id ? 'Edit discount code' : 'Create discount code'}</h3>
                        <button type="button" onClick={() => setShowDiscountForm(false)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold mb-1">Discount code</label>
                          <div className="flex gap-2">
                            <input type="text" value={discountCode} onChange={e => setDiscountCode(e.target.value)} required
                              className="flex-1 px-3 py-1.5 border rounded text-xs focus:outline-none uppercase" placeholder="e.g. SUMMER10" />
                            <button
                              type="button"
                              onClick={() => {
                                const codes = ['GAMER', 'TECH', 'OFFICE', 'DISCOUNT', 'SALE'];
                                const random = codes[Math.floor(Math.random() * codes.length)] + Math.floor(10 + Math.random() * 90);
                                setDiscountCode(random);
                              }}
                              className="px-2.5 py-1.5 border rounded text-xs bg-gray-50 font-bold hover:bg-gray-100"
                            >
                              Generate
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold mb-1">Type</label>
                          <select value={discountType} onChange={e => setDiscountType(e.target.value)}
                            className="w-full px-3 py-1.5 border rounded text-xs bg-white focus:outline-none">
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed_amount">Fixed Amount ($)</option>
                            <option value="free_shipping">Free Shipping</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold mb-1">Value</label>
                          <input type="number" value={discountValue} onChange={e => setDiscountValue(+e.target.value)} required
                            className="w-full px-3 py-1.5 border rounded text-xs focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold mb-1">Min subtotal ($)</label>
                          <input type="number" value={discountMinReq} onChange={e => setDiscountMinReq(+e.target.value)}
                            className="w-full px-3 py-1.5 border rounded text-xs focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold mb-1">Usage limit (orders)</label>
                          <input type="number" value={discountUsageLimit} onChange={e => setDiscountUsageLimit(e.target.value)}
                            className="w-full px-3 py-1.5 border rounded text-xs focus:outline-none" placeholder="Unlimited" />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <button type="button" onClick={() => setShowDiscountForm(false)} className="px-3 py-1.5 border rounded text-xs font-bold hover:bg-slate-50">Cancel</button>
                        <button type="submit" className="px-4 py-1.5 bg-[#164475] text-white rounded text-xs font-bold hover:bg-[#10355c]">Save discount</button>
                      </div>
                    </form>
                  )}

                  {!showDiscountForm && (
                    <div className="bg-white rounded-lg border border-[#ebebeb] shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#fafafa] border-b border-[#ebebeb] text-[#5c5c5c] font-bold">
                            <tr>
                              <th className="px-5 py-3">Code</th>
                              <th className="px-5 py-3">Type</th>
                              <th className="px-5 py-3 text-right">Value</th>
                              <th className="px-5 py-3 text-right">Min Requirement</th>
                              <th className="px-5 py-3 text-center">Usages</th>
                              <th className="px-5 py-3">Status</th>
                              <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#ebebeb]">
                            {discounts.length === 0 && (
                              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400 font-semibold">No discount codes configured.</td></tr>
                            )}
                            {discounts.map(disc => (
                              <tr key={disc._id} className="hover:bg-[#f6f6f7] transition-colors">
                                <td className="px-5 py-3 font-extrabold text-[#1a1a1a]">{disc.code}</td>
                                <td className="px-5 py-3 font-semibold capitalize text-[#5c5c5c]">{disc.type?.replace('_', ' ')}</td>
                                <td className="px-5 py-3 text-right font-bold">{disc.type === 'free_shipping' ? '—' : disc.type === 'percentage' ? `${disc.value}%` : `$${disc.value}`}</td>
                                <td className="px-5 py-3 text-right text-[#5c5c5c] font-semibold">${disc.minRequirement || 0}</td>
                                <td className="px-5 py-3 text-center font-bold">{disc.usageCount} {disc.usageLimit ? `/ ${disc.usageLimit}` : 'usages'}</td>
                                <td className="px-5 py-3">
                                  <button onClick={() => handleToggleDiscountActive(disc)} className="hover:scale-105 transition-transform">
                                    <StatusBadge s={disc.isActive ? 'active' : 'inactive'} />
                                  </button>
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <div className="flex gap-2 justify-end">
                                    <button onClick={() => {
                                      setEditingDiscount(disc);
                                      setDiscountCode(disc.code); setDiscountType(disc.type); setDiscountValue(disc.value); setDiscountMinReq(disc.minRequirement || 0); setDiscountUsageLimit(disc.usageLimit ? String(disc.usageLimit) : '');
                                      setShowDiscountForm(true);
                                    }} className="p-1 border rounded bg-white text-[#164475] hover:bg-[#f0f7ff] font-bold text-[10px]">Edit</button>
                                    <button onClick={() => handleDeleteDiscount(disc._id)} className="p-1 border rounded bg-white text-red-500 hover:bg-red-50 font-bold text-[10px]">Delete</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ INBOX TAB (Unified Messages & AI Chats) ═══ */}
              {activeTab === 'inbox' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h1 className="text-xl font-bold">Inbox</h1>
                    <div className="flex gap-2">
                      <button onClick={() => setInboxSubTab('chats')} className={`px-4 py-1.5 rounded text-xs font-bold border transition-colors ${inboxSubTab === 'chats' ? 'bg-[#f0f7ff] text-[#164475] border-[#164475]/30' : 'bg-white text-[#5c5c5c] border-[#cbd5e1]'}`}>AI Live Chats</button>
                      <button onClick={() => setInboxSubTab('contact')} className={`px-4 py-1.5 rounded text-xs font-bold border transition-colors ${inboxSubTab === 'contact' ? 'bg-[#f0f7ff] text-[#164475] border-[#164475]/30' : 'bg-white text-[#5c5c5c] border-[#cbd5e1]'}`}>Emails / Contact Messages</button>
                    </div>
                  </div>

                  {inboxSubTab === 'chats' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white rounded-lg border border-[#cbd5e1] min-h-[500px] overflow-hidden shadow-sm">
                      {/* Left list */}
                      <div className="border-r border-[#cbd5e1] divide-y divide-[#ebebeb] overflow-y-auto max-h-[550px]">
                        {chatSessions.length === 0 && <div className="p-8 text-center text-xs text-[#5c5c5c]">No active chat sessions.</div>}
                        {chatSessions.map(sess => (
                          <div key={sess._id} onClick={() => setSelectedChatSession(sess)} className={`p-4 cursor-pointer hover:bg-[#f6f6f7] transition-all ${selectedChatSession?._id === sess._id ? 'bg-[#e6f7ff]' : ''}`}>
                            <div className="flex justify-between items-start mb-1">
                              <p className="font-bold text-xs text-[#1a1a1a] truncate w-32">{sess.user?.name || sess.sessionId.slice(0,8)}</p>
                              <span className="text-[9px] text-gray-400">{new Date(sess.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <p className="text-[10px] text-[#5c5c5c] truncate">{sess.messages?.[sess.messages.length - 1]?.content || 'Session started'}</p>
                            {sess.escalatedToHuman && <span className="bg-red-100 text-red-800 border border-red-200 text-[8px] font-black rounded-full px-1.5 py-0.2 mt-1 inline-block">ESCALATED</span>}
                          </div>
                        ))}
                      </div>

                      {/* Chat dialog preview */}
                      <div className="md:col-span-2 flex flex-col justify-between max-h-[550px]">
                        {selectedChatSession ? (
                          <>
                            <div className="p-4 border-b border-[#cbd5e1] bg-gray-50 flex items-center justify-between">
                              <div>
                                <h3 className="font-bold text-xs">Session: {selectedChatSession.sessionId}</h3>
                                <p className="text-[10px] text-[#5c5c5c]">{selectedChatSession.user?.email || 'Guest user interaction'}</p>
                              </div>
                              {selectedChatSession.escalatedToHuman && (
                                <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded">Action Required</span>
                              )}
                            </div>
                            
                            <div className="flex-1 p-4 space-y-3 overflow-y-auto text-xs chat-scroll max-h-[400px]">
                              {selectedChatSession.messages?.map((m: any, idx: number) => (
                                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`p-2.5 rounded max-w-[70%] border ${m.role === 'user' ? 'bg-[#cbd5e1]/40 border-[#cbd5e1]' : 'bg-[#f0f7ff] border-[#cbd5e1]'}`}>
                                    <p className="font-bold text-[9px] text-[#5c5c5c] leading-none mb-1">{m.role === 'user' ? 'Customer' : 'AdamBot'}</p>
                                    <p className="whitespace-pre-wrap">{m.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="p-3 border-t border-[#cbd5e1] bg-gray-50 flex gap-2">
                              <input type="text" placeholder="Type a response to override AI..." className="flex-1 border rounded text-xs px-3 py-1.5 outline-none focus:border-[#164475]" />
                              <button className="px-4 py-1.5 bg-[#164475] text-white rounded text-xs font-bold">Reply</button>
                            </div>
                          </>
                        ) : (
                          <div className="flex-1 flex flex-col justify-center items-center text-center p-8 text-[#5c5c5c]">
                            <Mail className="w-8 h-8 mb-2" />
                            <p className="text-xs font-bold">Select a chat session to review dialogue history</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {inboxSubTab === 'contact' && (
                    <div className="bg-white rounded-lg border border-[#cbd5e1] shadow-sm overflow-hidden">
                      <div className="divide-y divide-[#ebebeb]">
                        {messages.length === 0 && <div className="p-8 text-center text-xs text-[#5c5c5c]">No email inquiries found.</div>}
                        {messages.map(msg => (
                          <div key={msg._id} className={`p-5 hover:bg-[#fafafa] transition-colors ${!msg.read ? 'bg-[#164475]/5' : ''}`}>
                            <div className="flex justify-between items-start mb-1 text-xs">
                              <div>
                                <h3 className={`font-bold ${!msg.read ? 'text-[#164475]' : 'text-[#1a1a1a]'}`}>{msg.subject}</h3>
                                <p className="text-[10px] text-gray-500 font-semibold">From: {msg.name} ({msg.email}) {msg.phone && `• Ph: ${msg.phone}`}</p>
                              </div>
                              <span className="text-[10px] text-gray-400">{new Date(msg.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-gray-700 whitespace-pre-wrap mt-2">{msg.message}</p>
                            {!msg.read && (
                              <button onClick={() => handleMarkMessageRead(msg._id)} className="mt-3 text-[10px] font-bold text-[#164475] hover:underline">Mark as Read</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ ONLINE STORE VIEW TAB ═══ */}
              {activeTab === 'online-store' && (
                <div className="bg-white rounded-lg border border-[#cbd5e1] p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h2 className="text-base font-bold text-[#1a1a1a]">Online Store Status</h2>
                    <span className="bg-[#f0f7ff] text-[#164475] text-xs font-bold px-3 py-1 rounded border border-[#164475]/30">LIVE & PUBLIC</span>
                  </div>
                  <p className="text-xs text-[#5c5c5c]">Your digital storefront is active at <span className="font-bold text-[#164475]">localhost:3000</span>. Customers can search hardware products, add components to cart, and checkout seamlessly.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 text-xs">
                    <div className="p-4 border rounded bg-gray-50 space-y-2">
                      <h4 className="font-bold">Theme and Styling</h4>
                      <p className="text-[#5c5c5c]">Active layout style: Adamjee Computers Premium Red/Dark Theme. Smooth client transitions enabled.</p>
                      <button className="text-xs font-bold text-[#164475] hover:underline">Customize theme →</button>
                    </div>
                    <div className="p-4 border rounded bg-gray-50 space-y-2">
                      <h4 className="font-bold">Store Preferences</h4>
                      <p className="text-[#5c5c5c]">Active integrations: Safepay Sandbox API, OpenAI AI Chatbot assistant, GST Tax configurations.</p>
                      <button className="text-xs font-bold text-[#164475] hover:underline">Edit preferences →</button>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ INVOICES APP TAB ═══ */}
              {activeTab === 'invoices' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-lg border border-[#cbd5e1] shadow-sm p-6 space-y-4">
                      <h3 className="text-xs font-bold text-[#164475] uppercase tracking-wider">1. Customer Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { label: 'Customer Name *', value: invoiceCustomerName, setter: setInvoiceCustomerName, ph: 'Ahmad Khan...' },
                          { label: 'Customer Phone', value: invoiceCustomerPhone, setter: setInvoiceCustomerPhone, ph: '0300-1234567' },
                          { label: 'Customer Email', value: invoiceCustomerEmail, setter: setInvoiceCustomerEmail, ph: 'customer@gmail.com' },
                        ].map(({ label, value, setter, ph }) => (
                          <div key={label}>
                            <label className="block text-[10px] font-bold text-[#1a1a1a] mb-1">{label}</label>
                            <input value={value} onChange={e => setter(e.target.value)}
                              className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded text-xs focus:outline-none" placeholder={ph} />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#1a1a1a] mb-1">Billing / Delivery Address</label>
                        <textarea value={invoiceCustomerAddress} onChange={e => setInvoiceCustomerAddress(e.target.value)}
                          rows={2} className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded text-xs focus:outline-none resize-none"
                          placeholder="House #12, Street 4, Karachi" />
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-[#cbd5e1] shadow-sm p-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold text-[#164475] uppercase tracking-wider">2. Line Items</h3>
                        <button onClick={() => setInvoiceItems([...invoiceItems, { productId: '', name: '', price: 0, cost: 0, quantity: 1 }])}
                          className="px-2.5 py-1 bg-[#164475]/5 text-[#164475] text-[10px] font-bold rounded hover:bg-[#164475]/10 transition-colors">+ Add Row</button>
                      </div>
                      <div className="space-y-3">
                        {invoiceItems.map((item, idx) => (
                          <div key={idx} className="flex flex-col md:flex-row gap-3 items-stretch md:items-center bg-gray-50 p-4 rounded border border-[#ebebeb] relative">
                            <div className="flex-1 space-y-2">
                              <select value={item.productId} onChange={(e) => {
                                const val = e.target.value;
                                const matched = products.find(p => p._id === val || p.id === val);
                                const updated = [...invoiceItems];
                                updated[idx] = { productId: val, name: matched ? matched.name : '', price: matched ? matched.price : 0, cost: matched ? (matched.costPerItem || 0) : 0, quantity: item.quantity };
                                setInvoiceItems(updated);
                              }} className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded text-xs bg-white focus:outline-none">
                                <option value="">-- Choose Item from Inventory --</option>
                                {products.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name} (${p.price})</option>)}
                              </select>
                              <input value={item.name} onChange={(e) => { const updated = [...invoiceItems]; updated[idx].name = e.target.value; setInvoiceItems(updated); }}
                                className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded text-xs bg-white focus:outline-none" placeholder="Or type manual item name..." />
                            </div>
                            <div className="flex gap-2 w-full md:w-auto items-center">
                              {[
                                { label: 'Price', key: 'price', w: 'w-20' },
                                { label: 'Cost', key: 'cost', w: 'w-20' },
                                { label: 'Qty', key: 'quantity', w: 'w-12' },
                              ].map(({ label, key, w }) => (
                                <div key={key} className={w}>
                                  <label className="block text-[9px] font-bold text-gray-500 mb-0.5">{label}</label>
                                  <input type="number" min={key === 'quantity' ? 1 : 0} value={item[key]}
                                    onChange={(e) => { const updated = [...invoiceItems]; updated[idx][key] = +e.target.value; setInvoiceItems(updated); }}
                                    className="w-full px-2 py-1 border border-[#cbd5e1] rounded text-xs bg-white focus:outline-none text-center" />
                                </div>
                              ))}
                              <div className="pt-3">
                                <button onClick={() => { const updated = invoiceItems.filter((_, i) => i !== idx); setInvoiceItems(updated.length > 0 ? updated : [{ productId: '', name: '', price: 0, cost: 0, quantity: 1 }]); }}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-[#cbd5e1] shadow-sm p-6 space-y-4">
                      <h3 className="text-xs font-bold text-[#164475] uppercase tracking-wider">3. Payment & Remarks</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold mb-1">Payment Method</label>
                          <select value={invoicePaymentMethod} onChange={e => setInvoicePaymentMethod(e.target.value)}
                            className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded text-xs bg-white">
                            {['Cash', 'Card', 'Bank Transfer', 'COD'].map(m => <option key={m}>{m}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold mb-1">Notes / Remarks</label>
                          <input value={invoiceNotes} onChange={e => setInvoiceNotes(e.target.value)}
                            className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded text-xs focus:outline-none" placeholder="Warranty note..." />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white rounded-lg border border-[#cbd5e1] shadow-sm p-6 space-y-4 sticky top-6">
                      <h3 className="text-xs font-bold text-[#164475] uppercase tracking-wider">Invoice Summary</h3>
                      <div className="space-y-3 border-b pb-4 text-xs font-semibold text-[#5c5c5c]">
                        <div>
                          <label className="block text-[9px] font-bold text-[#1a1a1a] mb-1">Discount</label>
                          <div className="flex gap-2">
                            <input type="number" value={invoiceDiscountValue} onChange={e => setInvoiceDiscountValue(+e.target.value)}
                              className="flex-1 px-3 py-1 border rounded text-xs outline-none" />
                            <select value={invoiceDiscountType} onChange={e => setInvoiceDiscountType(e.target.value as any)}
                              className="w-12 px-1 py-1 border rounded text-xs bg-white">
                              <option value="fixed">$</option>
                              <option value="percentage">%</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-[#1a1a1a] mb-1">GST Rate (%)</label>
                          <input type="number" value={invoiceTaxRate} onChange={e => setInvoiceTaxRate(+e.target.value)}
                            className="w-full px-3 py-1 border rounded text-xs outline-none" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-[#1a1a1a] mb-1">Shipping Charges</label>
                          <input type="number" min={0} value={invoiceShippingCharges} onChange={e => setInvoiceShippingCharges(+e.target.value)}
                            className="w-full px-3 py-1 border rounded text-xs outline-none" />
                        </div>
                      </div>
                      {(() => {
                        const subtotal = invoiceItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
                        const discAmt = invoiceDiscountType === 'fixed' ? invoiceDiscountValue : (subtotal * invoiceDiscountValue) / 100;
                        const taxAmt = ((subtotal - discAmt) * invoiceTaxRate) / 100;
                        const total = subtotal - discAmt + taxAmt + invoiceShippingCharges;
                        return (
                          <div className="text-xs space-y-2 border-b pb-4 font-semibold text-[#5c5c5c]">
                            <div className="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>Discount:</span><span>-${discAmt.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>GST Tax:</span><span>+${taxAmt.toFixed(2)}</span></div>
                            {invoiceShippingCharges > 0 && <div className="flex justify-between"><span>Shipping:</span><span>+${invoiceShippingCharges.toFixed(2)}</span></div>}
                            <div className="flex justify-between text-base font-bold text-[#1a1a1a] pt-1"><span>Grand Total:</span><span>${total.toFixed(2)}</span></div>
                          </div>
                        );
                      })()}
                      <button onClick={handleSaveInvoice}
                        className="w-full py-2 bg-[#164475] hover:bg-[#10355c] text-white font-bold rounded text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                        <Printer className="w-3.5 h-3.5" /> Save & Print Invoice
                      </button>
                    </div>

                    {/* Saved Invoices list */}
                    {invoices.length > 0 && (
                      <div className="bg-white rounded-lg border border-[#cbd5e1] shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b bg-gray-50">
                          <h3 className="font-bold text-xs text-[#1a1a1a]">Recent Invoices</h3>
                        </div>
                        <div className="divide-y divide-[#ebebeb]">
                          {pagedInvoices.map(inv => (
                            <div key={inv._id} className="px-5 py-2.5 flex items-center justify-between hover:bg-[#f6f6f7] cursor-pointer text-xs" onClick={() => setSelectedInvoiceDetail(inv)}>
                              <div>
                                <p className="font-bold text-[#164475] font-mono">{inv.invoiceId}</p>
                                <p className="text-[#5c5c5c] text-[10px] mt-0.5">{inv.customerName}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">${inv.total?.toFixed(2)}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{new Date(inv.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <PaginationBar page={invoicesPage} totalPages={invoicesTotalPages} setPage={setInvoicesPage} total={invoices.length} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══ REPORTS APP TAB ═══ */}
              {activeTab === 'reports' && (
                <div className="bg-white rounded-lg border border-[#cbd5e1] p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h2 className="text-base font-bold">Store Reports Manager</h2>
                    <button onClick={() => window.print()} className="px-3 py-1 bg-[#164475] text-white rounded text-xs font-semibold hover:bg-[#10355c]">Print PDF Summary</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-3 font-semibold text-[#1a1a1a]">
                    <div className="p-4 border rounded bg-gray-50 space-y-2">
                      <h4 className="font-bold text-[#164475]">Financial Report</h4>
                      <p className="text-[#5c5c5c]">Review margins, sales, cost of goods, and total net profits across physical invoice records.</p>
                      <button onClick={() => exportCSV(invoices, 'financials.csv', [{key:'invoiceId', label:'Invoice'}, {key:'customerName', label:'Customer'}, {key:'total', label:'Total'}])} className="text-xs text-[#164475] hover:underline font-bold">Export Excel →</button>
                    </div>

                    <div className="p-4 border rounded bg-gray-50 space-y-2">
                      <h4 className="font-bold text-[#164475]">Inventory Value Summary</h4>
                      <p className="text-[#5c5c5c]">Check live cost holdings, wholesale margins, items tags, and categories counts in real-time.</p>
                      <button onClick={() => exportCSV(products, 'inventory-holding.csv', [{key:'name', label:'Product'}, {key:'stock', label:'Stock'}, {key:'costPerItem', label:'Cost'}])} className="text-xs text-[#164475] hover:underline font-bold">Export Excel →</button>
                    </div>

                    <div className="p-4 border rounded bg-gray-50 space-y-2">
                      <h4 className="font-bold text-[#164475]">Customer LTV Breakdown</h4>
                      <p className="text-[#5c5c5c]">Analyze checkout values, conversion metrics, chatbot escalations, and active customer spent summaries.</p>
                      <button onClick={() => exportCSV(users, 'customers-ltv.csv', [{key:'name', label:'Customer'}, {key:'email', label:'Email'}])} className="text-xs text-[#164475] hover:underline font-bold">Export Excel →</button>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ GROWTH TAB ═══ */}
              {activeTab === 'growth' && (
                <div className="bg-white rounded-lg border border-[#cbd5e1] p-6 shadow-sm space-y-6">
                  <div className="flex justify-between items-center border-b pb-2">
                    <div>
                      <h2 className="text-base font-bold text-[#1a1a1a]">Marketing & Growth Dashboard</h2>
                      <p className="text-xs text-[#5c5c5c]">Grow your business by running custom marketing campaigns and analyzing customer acquisition channels.</p>
                    </div>
                  </div>

                  {/* Growth Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold">
                    <div className="p-4 border rounded-xl bg-gray-50 space-y-1">
                      <span className="text-[#5c5c5c]">Marketing Spend</span>
                      <p className="text-lg font-black text-[#1a1a1a]">PKR 45,000</p>
                      <span className="text-[10px] text-green-600">PKR 12,000 this week</span>
                    </div>
                    <div className="p-4 border rounded-xl bg-gray-50 space-y-1">
                      <span className="text-[#5c5c5c]">Attributed Sales</span>
                      <p className="text-lg font-black text-[#1a1a1a]">PKR 380,900</p>
                      <span className="text-[10px] text-green-600">+18.4% growth</span>
                    </div>
                    <div className="p-4 border rounded-xl bg-gray-50 space-y-1">
                      <span className="text-[#5c5c5c]">Conversion Rate</span>
                      <p className="text-lg font-black text-[#1a1a1a]">3.45%</p>
                      <span className="text-[10px] text-green-600">+0.8% change</span>
                    </div>
                    <div className="p-4 border rounded-xl bg-gray-50 space-y-1">
                      <span className="text-[#5c5c5c]">Customer LTV</span>
                      <p className="text-lg font-black text-[#1a1a1a]">PKR 12,400</p>
                      <span className="text-[10px] text-[#5c5c5c]">Average per customer</span>
                    </div>
                  </div>

                  {/* Campaigns Table */}
                  <div className="space-y-3 pt-3">
                    <h3 className="text-xs font-bold text-[#1a1a1a]">Active Marketing Campaigns</h3>
                    <div className="border border-[#cbd5e1] rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#f6f6f7] border-b font-bold text-[#5c5c5c]">
                          <tr>
                            <th className="p-3">Campaign Name</th>
                            <th className="p-3">Channel</th>
                            <th className="p-3">Spend</th>
                            <th className="p-3">Clicks</th>
                            <th className="p-3">Attributed Revenue</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-semibold text-[#1a1a1a]">
                          <tr>
                            <td className="p-3">Karachi Regal Plaza Store launch promo</td>
                            <td className="p-3">Google Search Ads</td>
                            <td className="p-3">PKR 15,000</td>
                            <td className="p-3">1,240 clicks</td>
                            <td className="p-3">PKR 145,000</td>
                            <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Active</span></td>
                          </tr>
                          <tr>
                            <td className="p-3">Custom Gaming PCs build campaign</td>
                            <td className="p-3">Facebook/Instagram Ads</td>
                            <td className="p-3">PKR 20,000</td>
                            <td className="p-3">3,450 clicks</td>
                            <td className="p-3">PKR 210,000</td>
                            <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Active</span></td>
                          </tr>
                          <tr>
                            <td className="p-3">Eid Festival RAM/SSD upgrade discounts</td>
                            <td className="p-3">SMS Newsletter</td>
                            <td className="p-3">PKR 10,000</td>
                            <td className="p-3">890 clicks</td>
                            <td className="p-3">PKR 25,900</td>
                            <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border">Completed</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ MARKETS TAB ═══ */}
              {activeTab === 'markets' && (
                <div className="bg-white rounded-lg border border-[#cbd5e1] p-6 shadow-sm space-y-6">
                  <div className="flex justify-between items-center border-b pb-2">
                    <div>
                      <h2 className="text-base font-bold text-[#1a1a1a]">Markets and Localization</h2>
                      <p className="text-xs text-[#5c5c5c]">Configure multiple target countries, default currencies, shipping rules, and custom localization settings.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                      <h3 className="text-xs font-bold text-[#1a1a1a]">Target Countries</h3>
                      <div className="border border-[#cbd5e1] rounded-lg divide-y text-xs font-semibold text-[#1a1a1a]">
                        <div className="p-4 flex items-center justify-between bg-gray-50">
                          <div>
                            <p className="font-bold">Pakistan (Primary Market)</p>
                            <p className="text-[10px] text-[#5c5c5c] mt-0.5">Currency: PKR (Rs.) · Languages: English, Urdu · Domains: primary</p>
                          </div>
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-bold">Primary</span>
                        </div>
                        <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                          <div>
                            <p className="font-bold">United Arab Emirates</p>
                            <p className="text-[10px] text-[#5c5c5c] mt-0.5">Currency: AED (Dirhams) · Languages: English, Arabic</p>
                          </div>
                          <span className="px-2.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full font-bold">Active</span>
                        </div>
                        <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                          <div>
                            <p className="font-bold">Saudi Arabia</p>
                            <p className="text-[10px] text-[#5c5c5c] mt-0.5">Currency: SAR (Riyals) · Languages: Arabic</p>
                          </div>
                          <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 border border-gray-200 rounded-full font-bold">Inactive</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#f8fafc] border border-[#e2e8f0] p-5 rounded-xl space-y-4 text-xs font-semibold text-[#1a1a1a]">
                      <h3 className="font-bold text-sm text-[#164475]">Global Selling Tips</h3>
                      <p className="text-[#5c5c5c] leading-relaxed">Customize your product pricing per market automatically or set exchange rate multipliers to offset local shipping costs.</p>
                      <div className="pt-2">
                        <span className="text-[10px] font-bold text-[#8a8a8a] uppercase block mb-1">Exchange Rate Rule</span>
                        <div className="flex gap-2">
                          <span className="px-2 py-1 bg-white border border-[#cbd5e1] rounded font-bold">Auto-fetch: Enabled</span>
                          <span className="px-2 py-1 bg-white border border-[#cbd5e1] rounded font-bold">Multiplier: 1.05x</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ AGENTIC CHANNEL TAB ═══ */}
              {activeTab === 'agentic' && (
                <div className="bg-white rounded-lg border border-[#cbd5e1] p-6 shadow-sm space-y-6">
                  <div className="flex justify-between items-center border-b pb-2">
                    <div>
                      <h2 className="text-base font-bold text-[#1a1a1a] flex items-center gap-1.5">
                        <Sparkles className="w-5 h-5 text-[#8f61f7]" /> Autonomous AI Agent (Agentic Channel)
                      </h2>
                      <p className="text-xs text-[#5c5c5c]">Configure the AI chatbot to proactively assist storefront visitors, generate checkout links, and process compatibility inquiries autonomously.</p>
                    </div>
                  </div>

                  {/* Agentic KPIs */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-bold">
                    <div className="p-4 border rounded-xl bg-purple-50/50 border-purple-100 space-y-1">
                      <span className="text-purple-700">Conversations Handled</span>
                      <p className="text-lg font-black text-purple-900">1,480 chats</p>
                      <span className="text-[10px] text-purple-600">92% automated resolution</span>
                    </div>
                    <div className="p-4 border rounded-xl bg-purple-50/50 border-purple-100 space-y-1">
                      <span className="text-purple-700">Generated Revenue</span>
                      <p className="text-lg font-black text-purple-900">PKR 145,000</p>
                      <span className="text-[10px] text-purple-600">Via checkout link sharing</span>
                    </div>
                    <div className="p-4 border rounded-xl bg-purple-50/50 border-purple-100 space-y-1">
                      <span className="text-purple-700">Assisted checkouts</span>
                      <p className="text-lg font-black text-purple-900">24 orders</p>
                      <span className="text-[10px] text-purple-600">No human agent required</span>
                    </div>
                    <div className="p-4 border rounded-xl bg-purple-50/50 border-purple-100 space-y-1">
                      <span className="text-purple-700">Active sessions</span>
                      <p className="text-lg font-black text-purple-900">4 visitors</p>
                      <span className="text-[10px] text-purple-600">Browsing catalog right now</span>
                    </div>
                  </div>

                  {/* AI Agent Configuration / Log */}
                  <div className="grid lg:grid-cols-3 gap-6 text-xs font-semibold text-[#1a1a1a]">
                    <div className="lg:col-span-2 space-y-3">
                      <h3 className="font-bold text-sm text-[#1a1a1a]">Real-Time Agent Log</h3>
                      <div className="border border-[#cbd5e1] rounded-lg p-4 bg-[#f8fafc] font-mono space-y-2 text-[11px] leading-relaxed max-h-64 overflow-y-auto">
                        <p className="text-gray-500">[01:15:20] Info: Storefront customer resolved motherboard socket LGA1700 query.</p>
                        <p className="text-purple-600">[01:14:02] AI sales: Sharing checkout link for Corsair 16GB DDR5 memory to customer: ali.k@gmail.com.</p>
                        <p className="text-gray-500">[01:12:45] Info: Handling graphics card width limits compatibility checkout.</p>
                        <p className="text-gray-500">[01:10:12] Info: Storefront chat session initialized from Lahore IP address.</p>
                        <p className="text-[#164475]">[01:08:44] Escalation: Customer requesting custom quotation for corporate bulk purchase; forwarded to Admin inbox.</p>
                      </div>
                    </div>

                    <div className="border border-[#cbd5e1] rounded-xl p-5 bg-white space-y-4">
                      <h3 className="font-bold text-sm text-[#1a1a1a]">Agent Controls</h3>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span>Enable Storefront chat</span>
                          <input type="checkbox" defaultChecked className="w-4 h-4 text-[#8f61f7] border-gray-300 rounded focus:ring-[#8f61f7]" />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span>Autonomously build drafts</span>
                          <input type="checkbox" defaultChecked className="w-4 h-4 text-[#8f61f7] border-gray-300 rounded focus:ring-[#8f61f7]" />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span>Auto-suggest alternatives</span>
                          <input type="checkbox" defaultChecked className="w-4 h-4 text-[#8f61f7] border-gray-300 rounded focus:ring-[#8f61f7]" />
                        </label>
                      </div>
                      <div className="pt-2 border-t text-[10px] text-gray-500">
                        Agent is connected to GPT-4o Mini model and syncs with product catalog inventory real-time.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ SETTINGS TAB ═══ */}
              {activeTab === 'settings' && (
                <div className="bg-white rounded-lg border border-[#cbd5e1] p-6 max-w-2xl space-y-6 shadow-sm">
                  <div>
                    <h2 className="text-base font-bold text-[#1a1a1a]">Store details</h2>
                    <p className="text-xs text-[#5c5c5c] mt-0.5">Adamjee Computers uses this information to set up contact info on emails and order notifications.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                    <div>
                      <label className="block text-[10px] mb-1">Store Name</label>
                      <input value={storeSettings.storeName} onChange={e => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
                        className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded font-semibold text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] mb-1">Store Phone</label>
                      <input value={storeSettings.storePhone} onChange={e => setStoreSettings({ ...storeSettings, storePhone: e.target.value })}
                        className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded font-semibold text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] mb-1">Store Email</label>
                      <input value={storeSettings.storeEmail} onChange={e => setStoreSettings({ ...storeSettings, storeEmail: e.target.value })}
                        className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded font-semibold text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] mb-1">GST / Tax Number</label>
                      <input value={storeSettings.gstNumber} onChange={e => setStoreSettings({ ...storeSettings, gstNumber: e.target.value })}
                        className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded font-semibold text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] mb-1">Currency Symbol</label>
                      <input value={storeSettings.currency} onChange={e => setStoreSettings({ ...storeSettings, currency: e.target.value })}
                        className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded font-semibold text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] mb-1">Default GST Rate (%)</label>
                      <input type="number" value={storeSettings.defaultTaxRate} onChange={e => setStoreSettings({ ...storeSettings, defaultTaxRate: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded font-semibold text-xs" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold mb-1">Store Address</label>
                    <textarea value={storeSettings.storeAddress} onChange={e => setStoreSettings({ ...storeSettings, storeAddress: e.target.value })}
                      rows={3} className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded text-xs focus:outline-none resize-none font-semibold" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold mb-1">Invoice Terms & Conditions</label>
                    <textarea value={storeSettings.terms} onChange={e => setStoreSettings({ ...storeSettings, terms: e.target.value })}
                      rows={4} className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded text-xs focus:outline-none font-semibold" />
                  </div>

                  <button onClick={handleSaveSettings}
                    className="w-full py-2 bg-[#164475] hover:bg-[#10355c] text-white rounded text-xs font-bold transition-colors shadow-sm">
                    Save Settings
                  </button>
                </div>
              )}
            </>
          )}

        </main>
      </div>

      {/* ─── MODALS ─── */}

      {/* Product Form modal */}
      {showProductForm && (
        <ProductFormModal product={editingProduct} onClose={() => { setShowProductForm(false); setEditingProduct(null); }} onSave={handleSaveProduct} />
      )}

      {/* Stock Adjust modal */}
      {stockAdjustProduct && (
        <StockAdjustModal product={stockAdjustProduct} onClose={() => setStockAdjustProduct(null)} onSave={handleStockAdjust} />
      )}

      {/* Selected Product details modal */}
      {selectedProductDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedProductDetail(null)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 border border-[#cbd5e1]">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-base font-bold text-[#1a1a1a]">Product details</h2>
              <button onClick={() => setSelectedProductDetail(null)} className="w-8 h-8 rounded bg-[#f6f6f7] flex items-center justify-center hover:bg-[#ebebeb]"><X className="w-4 h-4 text-[#5c5c5c]" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <img src={selectedProductDetail.image} alt={selectedProductDetail.name} className="w-full h-64 object-contain bg-[#f6f6f7] rounded border p-2 border-[#cbd5e1]" />
              <div className="space-y-4 text-xs font-semibold text-[#5c5c5c]">
                <div>
                  <h3 className="text-sm font-bold text-[#1a1a1a]">{selectedProductDetail.name}</h3>
                  <p className="text-[10px] font-mono text-gray-500 mt-1">SKU: {selectedProductDetail.code} | Vendor: {selectedProductDetail.vendor}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="p-3 border rounded bg-gray-50"><p className="text-[9px] text-gray-400 font-bold uppercase">Price</p><p className="font-extrabold text-sm text-[#1a1a1a]">${selectedProductDetail.price}</p></div>
                  <div className="p-3 border rounded bg-gray-50"><p className="text-[9px] text-gray-400 font-bold uppercase">Stock holding</p><p className="font-extrabold text-sm text-[#1a1a1a]">{selectedProductDetail.stock} units</p></div>
                  <div className="p-3 border rounded bg-gray-50"><p className="text-[9px] text-gray-400 font-bold uppercase">Inventory Cost</p><p className="font-bold text-sm text-gray-700">${selectedProductDetail.costPerItem || 0}</p></div>
                  <div className="p-3 border rounded bg-gray-50"><p className="text-[9px] text-gray-400 font-bold uppercase">Margin</p><p className="font-bold text-sm text-emerald-600">
                    {selectedProductDetail.price > 0 && selectedProductDetail.costPerItem ? Math.round(((selectedProductDetail.price - selectedProductDetail.costPerItem) / selectedProductDetail.price) * 100) : 0}%
                  </p></div>
                </div>
                {selectedProductDetail.variants?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Configurations</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedProductDetail.variants.map((v: string) => (
                        <span key={v} className="bg-gray-100 border text-gray-700 text-[10px] px-2 py-0.5 rounded font-bold">{v}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button onClick={() => { setEditingProduct(selectedProductDetail); setShowProductForm(true); setSelectedProductDetail(null); }} className="px-4 py-2 bg-[#164475] text-white text-xs font-bold rounded hover:bg-[#10355c]">Edit product</button>
              <button onClick={() => setSelectedProductDetail(null)} className="px-4 py-2 border rounded text-xs font-bold hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Order details modal */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedOrderDetail(null)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 border border-[#cbd5e1]">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h2 className="text-base font-bold">Order Details {selectedOrderDetail.orderId}</h2>
                <p className="text-[10px] text-gray-500 font-semibold">{new Date(selectedOrderDetail.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedOrderDetail(null)} className="w-8 h-8 rounded bg-[#f6f6f7] flex items-center justify-center hover:bg-[#ebebeb]"><X className="w-4 h-4 text-[#5c5c5c]" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="md:col-span-2 border rounded p-4 space-y-3">
                <h4 className="font-bold text-[#164475] border-b pb-1.5">Items details</h4>
                <div className="space-y-2">
                  {selectedOrderDetail.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[#1a1a1a] font-semibold">
                      <span>{item.name} <strong className="text-gray-400">x{item.quantity}</strong></span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2 space-y-1 text-[#5c5c5c] font-semibold">
                  <div className="flex justify-between"><span>Subtotal:</span><span>${(selectedOrderDetail.subtotal || selectedOrderDetail.total).toFixed(2)}</span></div>
                  {selectedOrderDetail.discount > 0 && <div className="flex justify-between text-red-500"><span>Discount:</span><span>-${selectedOrderDetail.discount.toFixed(2)}</span></div>}
                  {selectedOrderDetail.shippingCost > 0 && <div className="flex justify-between"><span>Shipping Cost:</span><span>+${selectedOrderDetail.shippingCost.toFixed(2)}</span></div>}
                  <div className="flex justify-between font-bold text-sm text-[#1a1a1a] pt-1"><span>Total:</span><span>${selectedOrderDetail.total?.toFixed(2)}</span></div>
                </div>
              </div>

              <div className="border rounded p-4 space-y-3">
                <h4 className="font-bold text-[#164475] border-b pb-1.5">Customer info</h4>
                <div className="space-y-1 text-[#5c5c5c] font-semibold">
                  <p className="font-bold text-[#1a1a1a]">{selectedOrderDetail.shippingAddress?.fullName || 'Walk-in Customer'}</p>
                  <p className="text-[10px] break-all">{selectedOrderDetail.guestEmail || 'N/A'}</p>
                  <p className="text-[10px]">{selectedOrderDetail.shippingAddress?.phone || 'N/A'}</p>
                  <p className="text-[10px]">{selectedOrderDetail.shippingAddress?.address || 'N/A'}</p>
                </div>
                <div className="border-t pt-2 space-y-2">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Order Status</label>
                    <select
                      value={selectedOrderDetail.orderStatus}
                      onChange={e => handleUpdateOrderStatus(selectedOrderDetail.orderId, e.target.value)}
                      className="w-full text-[10px] border rounded bg-white p-1"
                    >
                      {['draft', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(st => (
                        <option key={st} value={st}>{st.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button onClick={() => setSelectedOrderDetail(null)} className="px-4 py-2 border rounded text-xs font-bold hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Customer profile detail modal */}
      {selectedCustomerDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCustomerDetail(null)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-lg p-6 space-y-6 border border-[#cbd5e1]">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h2 className="text-base font-bold">{selectedCustomerDetail.name}</h2>
                <p className="text-[10px] text-gray-500 font-semibold">Customer Account Profile</p>
              </div>
              <button onClick={() => setSelectedCustomerDetail(null)} className="w-8 h-8 rounded bg-[#f6f6f7] flex items-center justify-center hover:bg-[#ebebeb]"><X className="w-4 h-4 text-[#5c5c5c]" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-[#5c5c5c]">
              <div className="p-3 border rounded bg-gray-50"><p className="text-[9px] text-gray-400 font-bold uppercase">Total Orders placed</p><p className="font-bold text-sm text-[#1a1a1a]">{selectedCustomerDetail.orderCount}</p></div>
              <div className="p-3 border rounded bg-gray-50"><p className="text-[9px] text-gray-400 font-bold uppercase">Lifetime Value (LTV)</p><p className="font-extrabold text-sm text-[#164475]">${selectedCustomerDetail.totalSpent.toFixed(2)}</p></div>
              <div className="p-3 border rounded bg-gray-50"><p className="text-[9px] text-gray-400 font-bold uppercase">Email address</p><p className="font-semibold text-xs text-[#1a1a1a] break-all">{selectedCustomerDetail.email}</p></div>
              <div className="p-3 border rounded bg-gray-50"><p className="text-[9px] text-gray-400 font-bold uppercase">Phone number</p><p className="font-semibold text-xs text-[#1a1a1a]">{selectedCustomerDetail.phone || '—'}</p></div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold text-xs mb-2">Store address records</h4>
              <div className="bg-gray-50 border p-3 rounded text-xs space-y-1 text-[#5c5c5c]">
                {selectedCustomerDetail.addresses?.length > 0 ? (
                  selectedCustomerDetail.addresses.map((a: any, i: number) => (
                    <p key={i} className="font-semibold">{a.fullName} • {a.street}, {a.city}, {a.postalCode}</p>
                  ))
                ) : (
                  <p className="italic text-gray-400 font-semibold">No address records configured.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setSelectedCustomerDetail(null)} className="px-4 py-2 border rounded text-xs font-bold hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Invoice detail modal */}
      {selectedInvoiceDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedInvoiceDetail(null)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 border border-[#cbd5e1]">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h2 className="text-base font-bold">Store Invoice {selectedInvoiceDetail.invoiceId}</h2>
                <p className="text-[10px] text-gray-500 font-semibold">{new Date(selectedInvoiceDetail.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedInvoiceDetail(null)} className="w-8 h-8 rounded bg-[#f6f6f7] flex items-center justify-center hover:bg-[#ebebeb]"><X className="w-4 h-4 text-[#5c5c5c]" /></button>
            </div>

            <div className="border rounded p-4 space-y-3 text-xs">
              <div className="flex justify-between items-start text-xs border-b pb-3">
                <div>
                  <h4 className="font-bold text-sm text-[#164475]">{storeSettings.storeName}</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">{storeSettings.storeAddress}</p>
                  <p className="text-[10px] text-gray-500">{storeSettings.storePhone}</p>
                </div>
                <div className="text-right">
                  <h4 className="font-bold">Billed To:</h4>
                  <p className="font-bold text-[#1a1a1a] mt-0.5">{selectedInvoiceDetail.customerName}</p>
                  <p className="text-[10px] text-gray-500">{selectedInvoiceDetail.customerPhone}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h5 className="font-bold text-xs text-[#164475]">Purchased products:</h5>
                {selectedInvoiceDetail.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between font-semibold text-[#1a1a1a]">
                    <span>{item.name} <strong className="text-gray-400">x{item.quantity}</strong></span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 space-y-1 font-semibold text-[#5c5c5c] text-xs">
                <div className="flex justify-between"><span>Subtotal:</span><span>${selectedInvoiceDetail.subtotal?.toFixed(2)}</span></div>
                {selectedInvoiceDetail.discountAmount > 0 && <div className="flex justify-between text-red-500"><span>Discount:</span><span>-${selectedInvoiceDetail.discountAmount.toFixed(2)}</span></div>}
                <div className="flex justify-between"><span>GST Tax ({selectedInvoiceDetail.taxRate}%):</span><span>+${selectedInvoiceDetail.taxAmount?.toFixed(2)}</span></div>
                {selectedInvoiceDetail.shippingCharges > 0 && <div className="flex justify-between"><span>Shipping:</span><span>+${selectedInvoiceDetail.shippingCharges.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-sm text-[#1a1a1a] border-t pt-1.5"><span>Grand Total:</span><span>${selectedInvoiceDetail.total?.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button onClick={() => {
                setShowPrintInvoice({ ...selectedInvoiceDetail, _storeSettings: storeSettings });
              }} className="px-4 py-2 bg-[#164475] text-white text-xs font-bold rounded hover:bg-[#10355c] flex items-center gap-1"><Printer className="w-3.5 h-3.5" /> Print</button>
              <button onClick={() => handleDeleteInvoice(selectedInvoiceDetail._id)} className="px-4 py-2 border border-red-200 text-red-600 rounded hover:bg-red-50 text-xs font-bold">Delete invoice</button>
              <button onClick={() => setSelectedInvoiceDetail(null)} className="px-4 py-2 border rounded text-xs font-bold hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice printing overlay screen */}
      {showPrintInvoice && (
        <div className="fixed inset-0 z-[9999] bg-white overflow-y-auto flex justify-center p-8 text-black" style={{ fontFamily: 'monospace' }}>
          <div className="w-full max-w-xl space-y-6 text-sm">
            <div className="flex justify-between border-b pb-4">
              <div>
                <h1 className="text-xl font-bold">{activeStoreSettings.storeName}</h1>
                <p className="text-xs text-gray-500 mt-1">{activeStoreSettings.storeAddress}</p>
                <p className="text-xs text-gray-500">Ph: {activeStoreSettings.storePhone}</p>
                {activeStoreSettings.gstNumber && <p className="text-xs text-gray-500">GST: {activeStoreSettings.gstNumber}</p>}
              </div>
              <div className="text-right">
                <h2 className="text-base font-bold">INVOICE</h2>
                <p className="text-xs font-bold font-mono text-[#164475] mt-1">{showPrintInvoice.invoiceId}</p>
                <p className="text-xs text-gray-500 mt-1">Date: {new Date(showPrintInvoice.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="border-b pb-4">
              <h3 className="font-bold mb-1">Customer details:</h3>
              <p className="font-bold">{showPrintInvoice.customerName}</p>
              {showPrintInvoice.customerPhone && <p className="text-xs text-gray-500">Ph: {showPrintInvoice.customerPhone}</p>}
              {showPrintInvoice.customerEmail && <p className="text-xs text-gray-500">Email: {showPrintInvoice.customerEmail}</p>}
              {showPrintInvoice.customerAddress && <p className="text-xs text-gray-500">Address: {showPrintInvoice.customerAddress}</p>}
            </div>

            <div>
              <table className="w-full text-left text-xs border-b mb-4">
                <thead>
                  <tr className="border-b text-gray-500 font-bold">
                    <th className="py-2">Item Name</th>
                    <th className="py-2 text-right">Price</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {showPrintInvoice.items?.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2">{item.name}</td>
                      <td className="py-2 text-right">${item.price?.toFixed(2)}</td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right">${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end text-xs font-semibold text-gray-600">
                <div className="w-64 space-y-1.5">
                  <div className="flex justify-between"><span>Subtotal:</span><span>${showPrintInvoice.subtotal?.toFixed(2)}</span></div>
                  {showPrintInvoice.discountAmount > 0 && <div className="flex justify-between text-red-600"><span>Discount:</span><span>-${showPrintInvoice.discountAmount.toFixed(2)}</span></div>}
                  <div className="flex justify-between"><span>GST Tax ({showPrintInvoice.taxRate}%):</span><span>+${showPrintInvoice.taxAmount?.toFixed(2)}</span></div>
                  {showPrintInvoice.shippingCharges > 0 && <div className="flex justify-between"><span>Shipping:</span><span>+${showPrintInvoice.shippingCharges.toFixed(2)}</span></div>}
                  <div className="flex justify-between font-black text-sm text-black pt-2 border-t border-black"><span>Total Paid:</span><span>${showPrintInvoice.total?.toFixed(2)}</span></div>
                </div>
              </div>
            </div>

            {activeStoreSettings.terms && (
              <div className="text-[10px] text-gray-500 border-t pt-4 leading-relaxed font-semibold">
                <h4 className="font-bold mb-1">Terms and conditions:</h4>
                <p className="whitespace-pre-wrap">{activeStoreSettings.terms}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-8 print:hidden">
              <button onClick={() => window.print()} className="px-5 py-2 bg-[#164475] text-white font-bold rounded text-xs hover:bg-[#10355c]">Print</button>
              <button onClick={() => setShowPrintInvoice(null)} className="px-4 py-2 border rounded text-xs font-bold hover:bg-gray-50">Close receipt</button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Inventory Product Detail Drawer modal */}
      {inventoryDetailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setInventoryDetailProduct(null)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-lg p-6 space-y-6 border border-[#cbd5e1]">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-base font-bold">Inventory detail</h2>
              <button onClick={() => setInventoryDetailProduct(null)} className="w-8 h-8 rounded bg-[#f6f6f7] flex items-center justify-center hover:bg-[#ebebeb]"><X className="w-4 h-4 text-[#5c5c5c]" /></button>
            </div>
            
            <div className="bg-[#f6f6f7] p-3 rounded border border-[#cbd5e1] flex items-center gap-3 text-xs">
              <img src={inventoryDetailProduct.image} alt={inventoryDetailProduct.name} className="w-12 h-12 object-contain bg-white rounded border border-[#cbd5e1] p-1 flex-shrink-0" />
              <div>
                <p className="font-bold text-[#1a1a1a]">{inventoryDetailProduct.name}</p>
                <p className="text-[10px] text-[#5c5c5c] font-mono">SKU: {inventoryDetailProduct.code}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
              <div className="p-3 border rounded bg-gray-50"><p className="text-[9px] text-gray-400 font-bold uppercase">Available units</p><p className="font-bold text-sm text-[#1a1a1a]">{inventoryDetailProduct.stock} units</p></div>
              <div className="p-3 border rounded bg-gray-50"><p className="text-[9px] text-gray-400 font-bold uppercase">Cost per item</p><p className="font-bold text-sm text-[#1a1a1a]">${inventoryDetailProduct.costPerItem || 0}</p></div>
              <div className="p-3 border rounded bg-gray-50"><p className="text-[9px] text-gray-400 font-bold uppercase">Total wholesale value</p><p className="font-bold text-sm text-[#164475]">${((inventoryDetailProduct.stock || 0) * (inventoryDetailProduct.costPerItem || 0)).toLocaleString()}</p></div>
              <div className="p-3 border rounded bg-gray-50"><p className="text-[9px] text-gray-400 font-bold uppercase">Low Stock Threshold</p><p className="font-bold text-sm text-amber-600">{inventoryDetailProduct.lowStockThreshold || 5} units</p></div>
            </div>

            {/* Related adjustments log */}
            <div>
              <h4 className="font-bold text-xs mb-2">Adjustments log</h4>
              <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                {inventoryLog.filter(l => l.productId === (inventoryDetailProduct._id || inventoryDetailProduct.id)).length === 0 ? (
                  <p className="text-gray-400 italic text-[11px]">No inventory movement updates available.</p>
                ) : (
                  inventoryLog.filter(l => l.productId === (inventoryDetailProduct._id || inventoryDetailProduct.id)).map((log, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-gray-50 border rounded text-[11px] font-semibold text-[#5c5c5c]">
                      <span>{new Date(log.date).toLocaleDateString()}</span>
                      <span className="font-bold text-[#1a1a1a]">{log.type}</span>
                      <span className={log.qty > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{log.qty > 0 ? `+${log.qty}` : log.qty} units</span>
                      <span>Stock: {log.before} → {log.after}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-4">
              <button onClick={() => { setStockAdjustProduct(inventoryDetailProduct); setInventoryDetailProduct(null); }} className="px-4 py-2 bg-[#164475] text-white text-xs font-bold rounded hover:bg-[#10355c]">Adjust stock level</button>
              <button onClick={() => setInventoryDetailProduct(null)} className="px-4 py-2 border rounded text-xs font-bold hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
