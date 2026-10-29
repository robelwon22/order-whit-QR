'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { supabase, pick } from '../../lib/supabase';
import { useStaff } from '../../lib/useStaff';
import { useI18n } from '../../lib/i18n';
import { useToast } from '../../components/ui/Toast';
import { AppShell } from '../../components/ui/AppShell';
import { Button, IconButton } from '../../components/ui/Button';
import { Input, Select, Toggle, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge, EmptyState, Skeleton, ConfirmDialog } from '../../components/ui/Badge';
import {
  Coffee,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Check,
  ChevronDown,
  ChevronUp,
  Upload,
  Eye,
  EyeOff,
  DollarSign,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function AdminMenuPage() {
  const { staff, cafe, cafes, setCafe, loading: authLoading, logout } = useStaff(['cafe_admin', 'super_admin']);
  const { showToast } = useToast();
  const { isAmharic } = useI18n();

  const [activeCafe, setActiveCafe] = useState(null);
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);

  // Collapsed categories state (map of catId -> bool)
  const [collapsedCats, setCollapsedCats] = useState({});

  // Modals
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'item'|'category', id, name }

  // Upload state
  const [uploadingItemId, setUploadingItemId] = useState(null);

  useEffect(() => {
    if (cafe && !activeCafe) setActiveCafe(cafe);
  }, [cafe, activeCafe]);

  const loadMenu = useCallback(async () => {
    if (!activeCafe) return;
    setLoadingMenu(true);
    try {
      const q = (t) =>
        supabase.from(t).select('*').eq('cafe_id', activeCafe.id).order('sort_order').order('created_at');
      const [cRes, iRes] = await Promise.all([q('categories'), q('items')]);
      setCats(cRes.data || []);
      setItems(iRes.data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingMenu(false);
    }
  }, [activeCafe, showToast]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const langs = activeCafe?.languages || ['en', 'am'];
  const defLang = activeCafe?.default_language || 'en';

  const toggleCategoryCollapse = (catId) => {
    setCollapsedCats((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Add Category Handler
  const handleAddCategory = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = {};
    langs.forEach((l) => {
      const val = (fd.get(`n_${l}`) || '').trim();
      if (val) name[l] = val;
    });

    if (Object.keys(name).length === 0) {
      showToast('Please enter a category name.', 'error');
      return;
    }

    const { error } = await supabase.from('categories').insert({
      cafe_id: activeCafe.id,
      name,
      visible: true,
      sort_order: cats.length,
    });

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('Category created.', 'success');
      setShowAddCatModal(false);
      loadMenu();
    }
  };

  // Add or Edit Item Handler
  const handleSaveItem = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const category_id = fd.get('category_id');
    const price = Number(fd.get('price'));

    const name = {};
    const description = {};
    langs.forEach((l) => {
      const nVal = (fd.get(`n_${l}`) || '').trim();
      if (nVal) name[l] = nVal;
      const dVal = (fd.get(`d_${l}`) || '').trim();
      if (dVal) description[l] = dVal;
    });

    if (Object.keys(name).length === 0 || !category_id || isNaN(price)) {
      showToast('Please provide a name, category, and valid price.', 'error');
      return;
    }

    if (editingItem) {
      // Update existing item
      const { error } = await supabase
        .from('items')
        .update({
          category_id,
          name,
          description,
          price,
        })
        .eq('id', editingItem.id);

      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Item updated.', 'success');
        setEditingItem(null);
        loadMenu();
      }
    } else {
      // Insert new item
      const { error } = await supabase.from('items').insert({
        cafe_id: activeCafe.id,
        category_id,
        name,
        description,
        price,
        available: true,
        sort_order: items.length,
      });

      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Item created.', 'success');
        setShowAddItemModal(false);
        loadMenu();
      }
    }
  };

  // Quick Price update onBlur
  const handleQuickPriceUpdate = async (item, newPrice) => {
    const p = Number(newPrice);
    if (isNaN(p) || p === Number(item.price)) return;
    const { error } = await supabase.from('items').update({ price: p }).eq('id', item.id);
    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(`Updated ${pick(item.name, defLang)} price to ${p.toFixed(2)}`, 'success');
      loadMenu();
    }
  };

  // Toggle item availability
  const handleToggleItemAvailability = async (item) => {
    const nextVal = !item.available;
    const { error } = await supabase.from('items').update({ available: nextVal }).eq('id', item.id);
    if (error) {
      showToast(error.message, 'error');
    } else {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, available: nextVal } : i)));
    }
  };

  // Toggle category visibility
  const handleToggleCategoryVisibility = async (cat) => {
    const nextVal = !cat.visible;
    const { error } = await supabase.from('categories').update({ visible: nextVal }).eq('id', cat.id);
    if (error) {
      showToast(error.message, 'error');
    } else {
      setCats((prev) => prev.map((c) => (c.id === cat.id ? { ...c, visible: nextVal } : c)));
    }
  };

  // Upload image to cafe-assets
  const handleUploadImage = async (item, file) => {
    if (!file) return;
    setUploadingItemId(item.id);
    try {
      const ext = file.name.split('.').pop();
      const path = `${activeCafe.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('cafe-assets').upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from('cafe-assets').getPublicUrl(path);
      const { error: updateErr } = await supabase
        .from('items')
        .update({ image_url: data.publicUrl })
        .eq('id', item.id);

      if (updateErr) throw updateErr;

      showToast('Photo uploaded successfully.', 'success');
      loadMenu();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploadingItemId(null);
    }
  };

  // Confirm delete handler
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'category') {
        const { error } = await supabase.from('categories').delete().eq('id', deleteConfirm.id);
        if (error) throw error;
        showToast('Category deleted.', 'success');
      } else {
        const { error } = await supabase.from('items').delete().eq('id', deleteConfirm.id);
        if (error) throw error;
        showToast('Item deleted.', 'success');
      }
      setDeleteConfirm(null);
      loadMenu();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <AppShell
      cafe={activeCafe}
      cafes={cafes}
      onSelectCafe={(c) => {
        setActiveCafe(c);
        setCafe(c);
      }}
      user={staff}
      onLogout={logout}
      title="Menu Management"
    >
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* ─── HEADER ACTIONS BAR ────────────────────────────────────────────── */}
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            padding: '20px 24px',
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 22,
                color: 'var(--color-espresso)',
                margin: 0,
              }}
            >
              Menu & Categories
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>
              {cats.length} categories · {items.length} items configured
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              icon={<Plus size={16} />}
              onClick={() => setShowAddCatModal(true)}
            >
              Add Category
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setShowAddItemModal(true)}
            >
              Add Item
            </Button>
          </div>
        </div>

        {/* ─── CATEGORIES & ITEMS LIST ────────────────────────────────────────── */}
        {loadingMenu ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Skeleton height={140} borderRadius={16} />
            <Skeleton height={140} borderRadius={16} />
          </div>
        ) : cats.length === 0 ? (
          <EmptyState
            type="coffee"
            title="No menu categories created"
            description="Create your first category (such as 'Espresso Drinks', 'Cold Brews', or 'Pastries') to start adding items."
            action={
              <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowAddCatModal(true)}>
                Create First Category
              </Button>
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {cats.map((cat) => {
              const catItems = items.filter((i) => i.category_id === cat.id);
              const isCollapsed = !!collapsedCats[cat.id];
              const catName = pick(cat.name, defLang, defLang);

              return (
                <div
                  key={cat.id}
                  className="card"
                  style={{
                    padding: 0,
                    overflow: 'hidden',
                    border: '1px solid var(--color-line)',
                    backgroundColor: 'var(--color-foam)',
                  }}
                >
                  {/* Category Header */}
                  <div
                    style={{
                      padding: '16px 20px',
                      backgroundColor: 'var(--color-cream)',
                      borderBottom: isCollapsed ? 'none' : '1px solid var(--color-line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleCategoryCollapse(cat.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                      <h3
                        style={{
                          fontSize: 17,
                          fontWeight: 700,
                          margin: 0,
                          fontFamily: 'var(--font-serif)',
                          color: 'var(--color-espresso)',
                        }}
                      >
                        {catName}
                      </h3>
                      <Badge variant="neutral" size="sm">
                        {catItems.length} {catItems.length === 1 ? 'item' : 'items'}
                      </Badge>
                      {!cat.visible && (
                        <Badge variant="warning" size="sm">
                          Hidden
                        </Badge>
                      )}
                    </div>

                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={cat.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                        onClick={() => handleToggleCategoryVisibility(cat)}
                        title={cat.visible ? 'Hide from customer menu' : 'Make visible to customers'}
                      >
                        {cat.visible ? 'Visible' : 'Hidden'}
                      </Button>

                      <IconButton
                        size={34}
                        variant="danger"
                        icon={<Trash2 size={15} />}
                        onClick={() =>
                          setDeleteConfirm({
                            type: 'category',
                            id: cat.id,
                            name: catName,
                          })
                        }
                        title="Delete Category"
                      />
                    </div>
                  </div>

                  {/* Items list inside category */}
                  {!isCollapsed && (
                    <div>
                      {catItems.length === 0 ? (
                        <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--color-muted)' }}>
                          <p style={{ fontSize: 13, marginBottom: 12 }}>No items in this category yet.</p>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<Plus size={14} />}
                            onClick={() => {
                              setShowAddItemModal(true);
                            }}
                          >
                            Add item to {catName}
                          </Button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {catItems.map((item) => {
                            const itemName = pick(item.name, defLang, defLang);
                            const itemDesc = pick(item.description, defLang, defLang);
                            const isUploading = uploadingItemId === item.id;

                            return (
                              <div
                                key={item.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '14px 20px',
                                  borderBottom: '1px solid var(--color-line)',
                                  gap: 16,
                                  flexWrap: 'wrap',
                                  opacity: item.available ? 1 : 0.6,
                                }}
                              >
                                {/* Thumbnail / Upload Trigger */}
                                <div style={{ position: 'relative' }}>
                                  {item.image_url ? (
                                    <img
                                      src={item.image_url}
                                      alt={itemName}
                                      style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 10,
                                        objectFit: 'cover',
                                        backgroundColor: 'var(--color-cream)',
                                        border: '1px solid var(--color-line)',
                                      }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 10,
                                        backgroundColor: 'var(--color-cream)',
                                        border: '1px solid var(--color-line)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--color-roast)',
                                        fontSize: 20,
                                      }}
                                    >
                                      ☕
                                    </div>
                                  )}

                                  {/* Hidden file input */}
                                  <label
                                    style={{
                                      position: 'absolute',
                                      bottom: -4,
                                      right: -4,
                                      width: 20,
                                      height: 20,
                                      borderRadius: '50%',
                                      backgroundColor: 'var(--color-roast)',
                                      color: '#FFF',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                    }}
                                    title="Upload Photo"
                                  >
                                    <input
                                      type="file"
                                      accept="image/*"
                                      style={{ display: 'none' }}
                                      onChange={(e) => handleUploadImage(item, e.target.files[0])}
                                    />
                                    <Upload size={10} />
                                  </label>
                                </div>

                                {/* Name & Description */}
                                <div style={{ flex: 1, minWidth: 160 }}>
                                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-espresso)' }}>
                                    {itemName}
                                  </div>
                                  {itemDesc && (
                                    <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
                                      {itemDesc}
                                    </div>
                                  )}
                                  {isUploading && (
                                    <div style={{ fontSize: 11, color: 'var(--color-caramel)' }}>
                                      Uploading image...
                                    </div>
                                  )}
                                </div>

                                {/* Quick Price Edit */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600 }}>
                                    {activeCafe.currency || 'ETB'}
                                  </span>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    defaultValue={item.price}
                                    onBlur={(e) => handleQuickPriceUpdate(item, e.target.value)}
                                    style={{
                                      width: 86,
                                      minHeight: 36,
                                      padding: '4px 8px',
                                      fontSize: 14,
                                      fontWeight: 700,
                                      color: 'var(--color-espresso)',
                                      textAlign: 'right',
                                      borderRadius: 'var(--radius-sm)',
                                    }}
                                    title="Edit price (saves automatically on blur)"
                                  />
                                </div>

                                {/* Availability Toggle */}
                                <Button
                                  size="sm"
                                  variant={item.available ? 'secondary' : 'ghost'}
                                  onClick={() => handleToggleItemAvailability(item)}
                                  style={{ minWidth: 100 }}
                                >
                                  {item.available ? '✓ Available' : 'Sold Out'}
                                </Button>

                                {/* Edit Details */}
                                <IconButton
                                  size={36}
                                  variant="secondary"
                                  icon={<Edit2 size={14} />}
                                  onClick={() => setEditingItem(item)}
                                  title="Edit full details"
                                />

                                {/* Delete Item */}
                                <IconButton
                                  size={36}
                                  variant="danger"
                                  icon={<Trash2 size={14} />}
                                  onClick={() =>
                                    setDeleteConfirm({
                                      type: 'item',
                                      id: item.id,
                                      name: itemName,
                                    })
                                  }
                                  title="Delete Item"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── ADD CATEGORY MODAL ─────────────────────────────────────────────── */}
      <Modal
        isOpen={showAddCatModal}
        onClose={() => setShowAddCatModal(false)}
        title="Add Menu Category"
        subtitle="Group your menu items (e.g. Traditional Buna, Cold Beverages, Pastries)"
      >
        <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {langs.map((l) => (
            <Input
              key={l}
              name={`n_${l}`}
              label={`Category Name (${l.toUpperCase()})`}
              placeholder={l === 'am' ? 'ለምሳሌ፡ የጀበና ቡና' : 'e.g., Jebena Buna & Traditional'}
              required={l === defLang}
            />
          ))}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="ghost" type="button" onClick={() => setShowAddCatModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Category</Button>
          </div>
        </form>
      </Modal>

      {/* ─── ADD / EDIT ITEM MODAL ──────────────────────────────────────────── */}
      <Modal
        isOpen={showAddItemModal || !!editingItem}
        onClose={() => {
          setShowAddItemModal(false);
          setEditingItem(null);
        }}
        title={editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
      >
        <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Category Selector */}
          <Select
            label="Category"
            name="category_id"
            defaultValue={editingItem?.category_id || cats[0]?.id || ''}
            required
          >
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {pick(c.name, defLang, defLang)}
              </option>
            ))}
          </Select>

          {/* Price */}
          <Input
            label={`Price (${activeCafe?.currency || 'ETB'})`}
            name="price"
            type="number"
            step="0.5"
            min="0"
            defaultValue={editingItem?.price || ''}
            placeholder="0.00"
            required
          />

          {/* Multi-language names */}
          {langs.map((l) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Input
                name={`n_${l}`}
                label={`Item Name (${l.toUpperCase()})`}
                defaultValue={editingItem?.name?.[l] || ''}
                placeholder={l === 'am' ? 'ለምሳሌ፡ ማኪያቶ' : 'e.g., Caramel Macchiato'}
                required={l === defLang}
                style={{ marginBottom: 0 }}
              />
              <Textarea
                name={`d_${l}`}
                label={`Description (${l.toUpperCase()})`}
                defaultValue={editingItem?.description?.[l] || ''}
                placeholder={l === 'am' ? 'የእቃው ዝርዝር መግለጫ' : 'Short appetizing description'}
                rows={2}
              />
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setShowAddItemModal(false);
                setEditingItem(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── CONFIRM DELETE DIALOG ──────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        title={`Delete "${deleteConfirm?.name}"?`}
        message={`Are you sure you want to permanently delete this ${deleteConfirm?.type}? This action cannot be reversed.`}
        confirmText={`Delete ${deleteConfirm?.type}`}
        danger
      />
    </AppShell>
  );
}
