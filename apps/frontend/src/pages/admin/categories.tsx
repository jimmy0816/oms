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
  ArrowRightCircleIcon,
} from '@heroicons/react/24/outline';
import CategoryModal from '@/components/CategoryModal';
import MoveCategoryModal from '@/components/MoveCategoryModal';
import MergeCategoryModal from '@/components/MergeCategoryModal';
import { useToast } from '@/contexts/ToastContext';

// --- CategoryTree Component (Presentational) ---
const CategoryTree = ({
  categories,
  renderContext,
}: {
  categories: Category[];
  renderContext: any;
}) => {
  const {
    draggedId,
    dropTarget,
    expandedIds,
    selectedIds,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    onToggleNode,
    onEdit,
    onDelete,
    onAddSubCategory,
    onSelect,
  } = renderContext;

  const renderCategory = (category: Category) => {
    const isExpanded = expandedIds.has(category.id);
    const hasChildren = category.children && category.children.length > 0;
    const isDropTarget = dropTarget?.id === category.id;
    const isDragged = draggedId === category.id;
    const isSelected = selectedIds.has(category.id);

    const getDropClassName = () => {
      if (!isDropTarget) return '';
      return dropTarget?.position === 'before'
        ? 'border-t-2 border-blue-500'
        : 'border-b-2 border-blue-500';
    };

    return (
      <li
        key={category.id}
        className={`p-2 my-1 bg-white rounded-md shadow-sm transition-all ${getDropClassName()} ${
          isDragged ? 'opacity-50' : ''
        }`}
        draggable
        onDragStart={(e) => handleDragStart(e, category)}
        onDragOver={(e) => handleDragOver(e, category)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, category)}
      >
        <div className="flex justify-between items-center group">
          <div className="flex items-center">
            <div
              className="mr-3 flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={isSelected}
                onChange={(e) => onSelect(category.id, e.target.checked)}
              />
            </div>

            {hasChildren ? (
              <button
                onClick={() => onToggleNode(category.id)}
                className="mr-2 p-1 rounded hover:bg-gray-100"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-8"></div>
            )}
            <span>{category.name}</span>
          </div>
          <div className="space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(category)}
              className="text-blue-500 hover:text-blue-700"
              title="編輯"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(category)}
              className="text-red-500 hover:text-red-700"
              title="刪除"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
            {category.level < 3 && (
              <button
                onClick={() => onAddSubCategory(category)}
                className="text-green-500 hover:text-green-700"
                title="新增子分類"
              >
                <FolderPlusIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <ul className="pl-6 border-l border-gray-200 mt-1">
            {category.children
              .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
              .map(renderCategory)}
          </ul>
        )}
      </li>
    );
  };

  return (
    <ul>
      {categories
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
        .map(renderCategory)}
    </ul>
  );
};

// --- ManageCategoriesPage Component (Container) ---
export default function ManageCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false); // New

  const [isSaving, setIsSaving] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isMerging, setIsMerging] = useState(false); // New

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const { showToast } = useToast();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- Drag and Drop State and Logic ---
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: 'before' | 'after';
  } | null>(null);

  // Helper to flatten categories for DnD lookup
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

  const handleDragStart = (
    e: React.DragEvent<HTMLLIElement>,
    category: Category,
  ) => {
    e.stopPropagation(); // Prevent event from bubbling up to parent LIs
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', category.id);
    setDraggedId(category.id);
  };

  const handleDragOver = (
    e: React.DragEvent<HTMLLIElement>,
    targetCategory: Category,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedId || draggedId === targetCategory.id) return;

    const draggedItem = flatCategories.find((c) => c.id === draggedId);
    if (!draggedItem) {
      setDropTarget(null);
      return;
    }

    // Check for circular dependency: cannot drop a parent into its own child/descendant
    let current = targetCategory;
    while (current.parentId) {
      if (current.parentId === draggedId) {
        setDropTarget(null);
        return;
      }
      const parent = flatCategories.find((c) => c.id === current.parentId);
      if (!parent) break;
      current = parent;
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

  const handleDrop = async (
    e: React.DragEvent<HTMLLIElement>,
    targetCategory: Category,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedId || !dropTarget) {
      setDraggedId(null);
      setDropTarget(null);
      return;
    }

    const draggedItem = flatCategories.find((c) => c.id === draggedId);
    if (!draggedItem) {
      setDraggedId(null);
      setDropTarget(null);
      return;
    }

    // Determine target parent ID (the parent of the node we are dropping next to)
    const targetParentId = targetCategory.parentId;

    const siblings = flatCategories
      .filter((c) => c.parentId === targetParentId && c.id !== draggedId)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    const targetIndex = siblings.findIndex((c) => c.id === dropTarget.id);

    // Insert dragged item into the transient siblings array for index calculation
    if (dropTarget.position === 'before') {
      siblings.splice(targetIndex, 0, draggedItem);
    } else {
      siblings.splice(targetIndex + 1, 0, draggedItem);
    }

    const updates = siblings.map((cat, index) => ({
      id: cat.id,
      displayOrder: index,
      parentId: targetParentId,
    }));

    setDraggedId(null);
    setDropTarget(null);

    try {
      await categoryService.updateCategoryOrder(updates);
      showToast('分類順序已更新', 'success');
      // If we moved to a new parent, expand that parent to show the item?
      if (draggedItem.parentId !== targetParentId && targetParentId) {
        setExpandedIds((prev) => new Set(prev).add(targetParentId));
      }
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
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleSelect = (categoryId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(categoryId);
      else next.delete(categoryId);
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkMove = (targetParentId: string | null) => {
    setIsMoving(true);
    const runMove = async () => {
      try {
        const selectedItems = flatCategories.filter((c) =>
          selectedIds.has(c.id),
        );

        // Find current last index in target
        const targetSiblings = flatCategories.filter(
          (c) => c.parentId === targetParentId && !selectedIds.has(c.id),
        );
        let lastOrder = targetSiblings.reduce(
          (max, c) => Math.max(max, c.displayOrder || 0),
          -1,
        );

        const updates = selectedItems.map((item, index) => ({
          id: item.id,
          parentId: targetParentId,
          displayOrder: lastOrder + 1 + index,
        }));

        await categoryService.updateCategoryOrder(updates);

        showToast(`成功移動 ${selectedItems.length} 個分類`, 'success');
        setIsMoveModalOpen(false);
        setSelectedIds(new Set());

        if (targetParentId) {
          setExpandedIds((prev) => new Set(prev).add(targetParentId));
        }

        await fetchCategories();
      } catch (e: any) {
        console.error(e);
        showToast('移動失敗: ' + e.message, 'error');
      } finally {
        setIsMoving(false);
      }
    };

    runMove();
  };

  const handleBulkMerge = async (
    sourceIds: string[],
    targetId: string | undefined,
    newName: string | undefined,
  ) => {
    setIsMerging(true);
    try {
      // Determines parentId for the new category if merging into a new one.
      // We default to the parent of the first source category.
      let parentIdForNew: string | undefined = undefined;
      if (!targetId && sourceIds.length > 0) {
        const firstSource = flatCategories.find((c) => c.id === sourceIds[0]);
        parentIdForNew = firstSource?.parentId || undefined;
      }

      await categoryService.mergeCategories(
        sourceIds,
        targetId,
        newName,
        parentIdForNew,
      );
      showToast('分類已成功整併', 'success');
      setIsMergeModalOpen(false);
      setSelectedIds(new Set());
      await fetchCategories();
    } catch (e: any) {
      console.error(e);
      showToast('整併失敗: ' + (e.response?.data?.error || e.message), 'error');
    } finally {
      setIsMerging(false);
    }
  };

  const handleBulkDelete = async () => {
    if (
      !window.confirm(
        `確定要刪除選取的 ${selectedIds.size} 個分類嗎？此動作無法復原。`,
      )
    )
      return;

    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => categoryService.deleteCategory(id)));

      showToast('删除成功', 'success');
      setSelectedIds(new Set());
      await fetchCategories();
    } catch (e: any) {
      console.error(e);
      showToast('部分刪除失敗，請檢查是否有關聯資料', 'error');
      await fetchCategories();
    }
  };

  const handleOpenModalForCreate = (parent: Category | null = null) => {
    setEditingCategory(null);
    setParentCategory(parent);
    setIsCategoryModalOpen(true);
  };

  const handleOpenModalForEdit = (category: Category) => {
    setEditingCategory(category);
    setParentCategory(null);
    setIsCategoryModalOpen(true);
  };

  const handleCloseCategoryModal = () => {
    setIsCategoryModalOpen(false);
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
        const newCategory = await categoryService.createCategory({
          name,
          parentId: parentCategory?.id || null,
        });
        showToast('分類已新增', 'success');
        if (newCategory.parentId) {
          parentIdToExpand = newCategory.parentId;
        }
      }
      handleCloseCategoryModal();
      await fetchCategories();

      if (parentIdToExpand) {
        setExpandedIds((prev) => new Set(prev).add(parentIdToExpand!));
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
    selectedIds,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    onToggleNode: toggleNode,
    onEdit: handleOpenModalForEdit,
    onDelete: handleDelete,
    onAddSubCategory: handleOpenModalForCreate,
    onSelect: handleSelect,
  };

  return (
    <>
      <Head>
        <title>分類管理 | OMS</title>
      </Head>
      <div className="space-y-6 relative">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">分類管理</h1>
          <div className="space-x-2 flex">
            {selectedIds.size > 0 && (
              <>
                {/* Only show Merge button if all selected categories are Level 3 */}
                {Array.from(selectedIds).every(
                  (id) => flatCategories.find((c) => c.id === id)?.level === 3,
                ) && (
                  <button
                    onClick={() => setIsMergeModalOpen(true)}
                    className="btn-secondary px-3 py-2 text-sm font-medium rounded-md flex items-center bg-white border border-gray-300 hover:bg-gray-50 text-indigo-700"
                  >
                    <ArrowRightCircleIcon className="h-4 w-4 mr-1 transform rotate-45" />
                    整併 ({selectedIds.size})
                  </button>
                )}
                <button
                  onClick={() => setIsMoveModalOpen(true)}
                  className="btn-secondary px-3 py-2 text-sm font-medium rounded-md flex items-center bg-white border border-gray-300 hover:bg-gray-50 text-gray-700"
                >
                  <ArrowRightCircleIcon className="h-4 w-4 mr-1" />
                  移動 ({selectedIds.size})
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="btn-danger px-3 py-2 text-sm font-medium rounded-md flex items-center bg-red-50 text-red-600 hover:bg-red-100"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  刪除 ({selectedIds.size})
                </button>
                <button
                  onClick={handleClearSelection}
                  className="text-sm text-gray-500 hover:text-gray-700 underline px-2"
                >
                  取消選取
                </button>
              </>
            )}
            <button
              onClick={() => handleOpenModalForCreate(null)}
              className="btn-primary px-4 py-2 text-sm font-medium rounded-md flex items-center bg-blue-600 text-white hover:bg-blue-700 ml-2"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              <span>新增頂層分類</span>
            </button>
          </div>
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
        isOpen={isCategoryModalOpen}
        onClose={handleCloseCategoryModal}
        onSave={handleSave}
        initialData={editingCategory}
        isSaving={isSaving}
      />

      <MoveCategoryModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onMove={handleBulkMove}
        categories={categories}
        movingCategoryIds={Array.from(selectedIds)}
        isMoving={isMoving}
      />

      <MergeCategoryModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        onMerge={handleBulkMerge}
        categories={categories}
        selectedIds={selectedIds}
        isMerging={isMerging}
      />
    </>
  );
}
