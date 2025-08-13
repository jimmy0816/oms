import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { categoryService, Category } from '@/services/categoryService';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  FolderPlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import CategoryModal from '@/components/CategoryModal';
import { useToast } from '@/contexts/ToastContext';

// --- CategoryTree Component (Presentational) ---
const CategoryTree = ({ 
  categories,
  renderContext,
}: { 
  categories: Category[],
  renderContext: any,
}) => {
  const { 
    draggedId, 
    dropTarget, 
    expandedIds, 
    handleDragStart, 
    handleDragOver, 
    handleDragLeave, 
    handleDrop, 
    onToggleNode, 
    onEdit, 
    onDelete, 
    onAddSubCategory 
  } = renderContext;

  const renderCategory = (category: Category) => {
    const isExpanded = expandedIds.has(category.id);
    const hasChildren = category.children && category.children.length > 0;
    const isDropTarget = dropTarget?.id === category.id;
    const isDragged = draggedId === category.id;

    const getDropClassName = () => {
      if (!isDropTarget) return '';
      return dropTarget?.position === 'before' ? 'border-t-2 border-blue-500' : 'border-b-2 border-blue-500';
    };

    return (
      <li 
        key={category.id} 
        className={`p-2 my-1 bg-white rounded-md shadow-sm transition-all ${getDropClassName()} ${isDragged ? 'opacity-50' : ''}`}
        draggable
        onDragStart={(e) => handleDragStart(e, category)}
        onDragOver={(e) => handleDragOver(e, category)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, category)}
      >
        <div className="flex justify-between items-center group">
          <div className="flex items-center">
            {hasChildren ? (
              <button onClick={() => onToggleNode(category.id)} className="mr-2 p-1 rounded hover:bg-gray-100">
                {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
              </button>
            ) : (
              <div className="w-8"></div>
            )}
            <span>{category.name}</span>
          </div>
          <div className="space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(category)} className="text-blue-500 hover:text-blue-700" title="編輯">
              <PencilIcon className="h-4 w-4" />
            </button>
            <button onClick={() => onDelete(category)} className="text-red-500 hover:text-red-700" title="刪除">
              <TrashIcon className="h-4 w-4" />
            </button>
            {category.level < 3 && (
              <button onClick={() => onAddSubCategory(category)} className="text-green-500 hover:text-green-700" title="新增子分類">
                <FolderPlusIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <ul className='pl-6 border-l border-gray-200 mt-1'>
            {category.children.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map(renderCategory)}
          </ul>
        )}
      </li>
    );
  };

  return (
    <ul>
      {categories.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map(renderCategory)}
    </ul>
  );
};

// --- ManageCategoriesPage Component (Container) ---
export default function ManageCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const { showToast } = useToast();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // --- Drag and Drop State and Logic ---
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string, position: 'before' | 'after' } | null>(null);

  const flatCategories = useMemo(() => {
    const flatten = (cats: Category[]): Omit<Category, 'children'>[] => {
      return cats.reduce<Omit<Category, 'children'>[]>((acc, cat) => {
        const { children, ...rest } = cat;
        acc.push(rest);
        if (children) {
          acc.push(...flatten(children));
        }
        return acc;
      }, []);
    };
    return flatten(categories);
  }, [categories]);

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, category: Category) => {
    e.stopPropagation(); // Prevent event from bubbling up to parent LIs
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', category.id);
    setDraggedId(category.id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>, targetCategory: Category) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedId || draggedId === targetCategory.id) return;

    const draggedItem = flatCategories.find(c => c.id === draggedId);
    if (!draggedItem || draggedItem.parentId !== targetCategory.parentId) {
      setDropTarget(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const verticalMidpoint = rect.top + rect.height / 2;

    if (e.clientY < verticalMidpoint) {
      setDropTarget({ id: targetCategory.id, position: 'before' });
    } else {
      setDropTarget({ id: targetCategory.id, position: 'after' });
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    setDropTarget(null);
  };

  const handleDrop = async (e: React.DragEvent<HTMLLIElement>, targetCategory: Category) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedId || !dropTarget) {
      setDraggedId(null);
      setDropTarget(null);
      return;
    }

    const draggedItem = flatCategories.find(c => c.id === draggedId);
    if (!draggedItem || draggedItem.parentId !== targetCategory.parentId) {
      showToast('只能在相同層級內進行排序', 'error');
      setDraggedId(null);
      setDropTarget(null);
      return;
    }

    const siblings = flatCategories
      .filter(c => c.parentId === draggedItem.parentId)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    const draggedIndex = siblings.findIndex(c => c.id === draggedId);
    const [removed] = siblings.splice(draggedIndex, 1);

    const targetIndex = siblings.findIndex(c => c.id === dropTarget.id);
    if (dropTarget.position === 'before') {
      siblings.splice(targetIndex, 0, removed);
    } else {
      siblings.splice(targetIndex + 1, 0, removed);
    }

    const updates = siblings.map((cat, index) => ({
      id: cat.id,
      displayOrder: index,
      parentId: cat.parentId,
    }));

    setDraggedId(null);
    setDropTarget(null);

    try {
      await categoryService.updateCategoryOrder(updates);
      showToast('分類順序已更新', 'success');
      await fetchCategories();
    } catch (error) {
      showToast('順序更新失敗', 'error');
      console.error(error);
    }
  };

  // --- Other Handlers ---
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const fetchedCategories = await categoryService.getAllCategories();
      setCategories(fetchedCategories);
      setError(null);
    } catch (err) {
      setError('無法載入分類資料');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const toggleNode = (nodeId: string) => {
    setExpandedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(nodeId)) {
            newSet.delete(nodeId);
        } else {
            newSet.add(nodeId);
        }
        return newSet;
    });
  };

  const handleOpenModalForCreate = (parent: Category | null = null) => {
    setEditingCategory(null);
    setParentCategory(parent);
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (category: Category) => {
    setEditingCategory(category);
    setParentCategory(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setParentCategory(null);
  };

  const handleSave = async (name: string) => {
    setIsSaving(true);
    try {
      let parentIdToExpand: string | null = null;
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, { name });
        showToast('分類已更新', 'success');
      } else {
        const newCategory = await categoryService.createCategory({ name, parentId: parentCategory?.id || null });
        showToast('分類已新增', 'success');
        if(newCategory.parentId) {
          parentIdToExpand = newCategory.parentId;
        }
      }
      handleCloseModal();
      await fetchCategories();

      if (parentIdToExpand) {
        setExpandedIds(prev => new Set(prev).add(parentIdToExpand!));
      }

    } catch (error) {
      showToast(editingCategory ? '更新失敗' : '新增失敗', 'error');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (window.confirm(`您確定要刪除分類「${category.name}」嗎？`)) {
      try {
        await categoryService.deleteCategory(category.id);
        showToast('分類已刪除', 'success');
        await fetchCategories();
      } catch (error: any) {
        showToast(error.message || '刪除失敗', 'error');
        console.error(error);
      }
    }
  };

  const renderContext = { 
    draggedId, 
    dropTarget, 
    expandedIds, 
    handleDragStart, 
    handleDragOver, 
    handleDragLeave, 
    handleDrop, 
    onToggleNode: toggleNode, 
    onEdit: handleOpenModalForEdit, 
    onDelete: handleDelete, 
    onAddSubCategory: handleOpenModalForCreate 
  };

  return (
    <>
      <Head>
        <title>分類管理 | OMS</title>
      </Head>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">分類管理</h1>
          <button onClick={() => handleOpenModalForCreate(null)} className="btn-primary px-4 py-2 text-sm font-medium rounded-md flex items-center">
            <PlusIcon className="h-4 w-4 mr-1" />
            <span>新增頂層分類</span>
          </button>
        </div>

        {loading && <p>載入中...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && (
          <div className="bg-gray-50 p-4 rounded-lg">
              <CategoryTree 
                categories={categories} 
                renderContext={renderContext}
              />
          </div>
        )}
      </div>
      <CategoryModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        initialData={editingCategory}
        isSaving={isSaving}
      />
    </>
  );
}
