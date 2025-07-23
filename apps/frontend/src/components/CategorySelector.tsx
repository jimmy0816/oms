import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { categoryService } from '@/services/categoryService';
import { Category } from 'shared-types';

// 定義分類結構的類型 (與 shared-types 中的 Category 介面保持一致)
export interface CategoryLevel3 extends Category {}
export interface CategoryLevel2 extends Category {
  children: CategoryLevel3[];
}
export interface CategoryLevel1 extends Category {
  children: CategoryLevel2[];
}

interface CategorySelectorProps {
  onCategorySelect: (categoryId: string, categoryPath: string) => void;
  selectedCategoryId?: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  onCategorySelect,
  selectedCategoryId,
}) => {
  const [categories, setCategories] = useState<CategoryLevel1[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLevel1, setExpandedLevel1] = useState<string[]>([]);
  const [displayCategoryPath, setDisplayCategoryPath] = useState<string | null>(
    null
  );

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const fetchedCategories = await categoryService.getAllCategories();
        setCategories(fetchedCategories as CategoryLevel1[]);

        // 如果有預設選中的分類，則展開其所屬的一級分類並顯示完整路徑
        if (selectedCategoryId) {
          for (const cat1 of fetchedCategories as CategoryLevel1[]) {
            for (const cat2 of cat1.children) {
              for (const cat3 of cat2.children) {
                if (cat3.id === selectedCategoryId) {
                  setExpandedLevel1([cat1.id]);
                  setDisplayCategoryPath(
                    `${cat1.name} > ${cat2.name} > ${cat3.name}`
                  );
                  break;
                }
              }
            }
          }
        } else if (fetchedCategories.length > 0) {
          // 否則，預設展開第一個大類
          setExpandedLevel1([fetchedCategories[0].id]);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // 切換一級分類的展開/收合，一次只展開一個大類
  const toggleLevel1 = (categoryId: string) => {
    if (expandedLevel1.includes(categoryId)) {
      setExpandedLevel1([]);
    } else {
      setExpandedLevel1([categoryId]);
    }
  };

  // 處理三級分類的選擇
  const handleCategorySelect = (
    category: CategoryLevel3,
    level1Name: string,
    level2Name: string
  ) => {
    const categoryPath = `${level1Name} > ${level2Name} > ${category.name}`;
    onCategorySelect(category.id, categoryPath);
    setDisplayCategoryPath(categoryPath);
  };

  if (loading) {
    return <div className="text-center py-4">載入分類中...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-500">載入分類失敗: {error}</div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          通報類別 <span className="text-red-500">*</span>
        </h3>
        <button
          type="button"
          onClick={() => setExpandedLevel1([])}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          全部收合
          <ChevronDownIcon className="h-4 w-4 ml-1 transform rotate-180" />
        </button>
      </div>
      {displayCategoryPath && (
        <div className="mb-4">
          <div className="text-sm text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis max-w-full block">
            <span className="font-medium">已選擇：</span>
            {displayCategoryPath}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {categories.length === 0 ? (
          <p className="text-center text-gray-500">沒有可用的分類。</p>
        ) : (
          categories.map((category1) => (
            <div
              key={category1.id}
              className="border border-gray-200 rounded-md overflow-hidden mb-2"
            >
              {/* 一級分類標題 */}
              <div
                className="bg-gray-50 px-4 py-2 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                onClick={() => toggleLevel1(category1.id)}
              >
                <div className="font-medium text-gray-800">
                  {category1.name}
                </div>
                {expandedLevel1.includes(category1.id) ? (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                )}
              </div>

              {/* 一級分類內容 */}
              {expandedLevel1.includes(category1.id) && (
                <div className="pl-4">
                  {category1.children &&
                    category1.children.map((category2) => (
                      <div
                        key={category2.id}
                        className="border-t border-gray-100"
                      >
                        {/* 二級分類標題 */}
                        <div className="px-4 py-2 bg-gray-50">
                          <div className="font-medium text-gray-700">
                            {category2.name}
                          </div>
                        </div>

                        {/* 三級分類選項，直接顯示 */}
                        <div className="pl-4 py-2 grid grid-cols-1 gap-2">
                          {category2.children &&
                            category2.children.map((category3) => (
                              <div
                                key={category3.id}
                                className="flex items-center py-1"
                              >
                                <input
                                  type="radio"
                                  id={category3.id}
                                  name="category"
                                  className="form-radio h-4 w-4 text-blue-600"
                                  checked={selectedCategoryId === category3.id}
                                  onChange={() =>
                                    handleCategorySelect(
                                      category3,
                                      category1.name,
                                      category2.name
                                    )
                                  }
                                />
                                <label
                                  htmlFor={category3.id}
                                  className="ml-2 text-sm text-gray-700 cursor-pointer"
                                >
                                  {category3.name}
                                </label>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CategorySelector;
