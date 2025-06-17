import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  PlusIcon,
  ExclamationCircleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

// 直接定義報告狀態常量，避免依賴 shared-types 中的枚舉
const ReportStatus = {
  UNCONFIRMED: 'UNCONFIRMED',
  PROCESSING: 'PROCESSING',
  REJECTED: 'REJECTED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  REVIEWED: 'REVIEWED',
  RETURNED: 'RETURNED'
};

const ReportPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

const ReportCategory = {
  FACILITY: 'FACILITY',
  SECURITY: 'SECURITY',
  ENVIRONMENT: 'ENVIRONMENT',
  SERVICE: 'SERVICE',
  OTHER: 'OTHER'
};

// 模擬通報資料
const mockReports = [
  {
    id: '1',
    title: '大廳電梯故障',
    description: '大廳左側電梯無法正常運作，按鈕無反應',
    status: ReportStatus.UNCONFIRMED,
    priority: ReportPriority.HIGH,
    category: ReportCategory.FACILITY,
    location: '總部大樓 1F',
    createdAt: new Date('2025-06-09T08:30:00Z'),
    updatedAt: new Date('2025-06-09T08:30:00Z'),
    creatorId: '1',
    creator: { id: '1', name: '李小明', email: 'lee@example.com', role: 'USER' },
    images: [
      'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23eaeaea%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20style%3D%22fill%3A%23757575%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%3Bfont-size%3A40px%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%E9%9B%BB%E6%A2%AF%E6%95%85%E9%9A%9C%E5%9C%96%E7%89%87%3C%2Ftext%3E%3C%2Fsvg%3E',
      'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23f5f5f5%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20style%3D%22fill%3A%23757575%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%3Bfont-size%3A40px%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%E6%95%85%E9%9A%9C%E8%A8%AD%E5%82%99%E5%9C%96%E7%89%87%3C%2Ftext%3E%3C%2Fsvg%3E',
      'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23333333%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20style%3D%22fill%3A%23ffffff%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%3Bfont-size%3A40px%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%E5%BD%B1%E7%89%87%E6%AA%94%E6%A1%88%3C%2Ftext%3E%3C%2Fsvg%3E'
    ]
  },
  {
    id: '2',
    title: '停車場監視器故障',
    description: 'B2停車場第3排監視器無法正常運作，畫面全黑',
    status: ReportStatus.PROCESSING,
    priority: ReportPriority.MEDIUM,
    category: ReportCategory.SECURITY,
    location: '總部大樓 B2',
    createdAt: new Date('2025-06-08T14:15:00Z'),
    updatedAt: new Date('2025-06-09T09:45:00Z'),
    creatorId: '2',
    creator: { id: '2', name: '王大華', email: 'wang@example.com', role: 'USER' },
    assigneeId: '3',
    assignee: { id: '3', name: '張小芳', email: 'zhang@example.com', role: 'MANAGER' },
    images: [
      'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23e6f7ff%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20style%3D%22fill%3A%23333%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%3Bfont-size%3A40px%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%E6%B0%B4%E7%AE%A1%E6%BC%8F%E6%B0%B4%E5%9C%96%E7%89%87%3C%2Ftext%3E%3C%2Fsvg%3E',
      'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23e3f2fd%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20style%3D%22fill%3A%23333%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%3Bfont-size%3A40px%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%E6%B0%B4%E6%BA%A2%E5%87%BA%E5%9C%96%E7%89%87%3C%2Ftext%3E%3C%2Fsvg%3E'
    ]
  },
  {
    id: '3',
    title: '會議室空調異常',
    description: '3F大會議室空調溫度異常，無法調整溫度',
    status: ReportStatus.PENDING_REVIEW,
    priority: ReportPriority.LOW,
    category: ReportCategory.FACILITY,
    location: '總部大樓 3F',
    createdAt: new Date('2025-06-07T10:20:00Z'),
    updatedAt: new Date('2025-06-09T16:30:00Z'),
    creatorId: '4',
    creator: { id: '4', name: '陳志明', email: 'chen@example.com', role: 'USER' },
    assigneeId: '3',
    assignee: { id: '3', name: '張小芳', email: 'zhang@example.com', role: 'MANAGER' },
    images: [
      'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23e8f5e9%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20style%3D%22fill%3A%23333%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%3Bfont-size%3A40px%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%E7%A9%BA%E8%AA%BF%E6%95%85%E9%9A%9C%E5%9C%96%E7%89%87%3C%2Ftext%3E%3C%2Fsvg%3E',
      'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23c8e6c9%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20style%3D%22fill%3A%23333%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%3Bfont-size%3A40px%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%E6%BA%AB%E5%BA%A6%E8%A8%88%E7%95%B0%E5%B8%B8%3C%2Ftext%3E%3C%2Fsvg%3E'
    ]
  },
  {
    id: '4',
    title: '廁所漏水',
    description: '2F男廁第二個隔間漏水嚴重',
    status: ReportStatus.REVIEWED,
    priority: ReportPriority.MEDIUM,
    category: ReportCategory.FACILITY,
    location: '總部大樓 2F',
    createdAt: new Date('2025-06-06T09:10:00Z'),
    updatedAt: new Date('2025-06-08T11:25:00Z'),
    creatorId: '2',
    creator: { id: '2', name: '王大華', email: 'wang@example.com', role: 'USER' },
    assigneeId: '5',
    assignee: { id: '5', name: '林美玲', email: 'lin@example.com', role: 'MANAGER' },
    reviewerId: '6',
    reviewer: { id: '6', name: '黃建國', email: 'huang@example.com', role: 'ADMIN' },
    images: [
      'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23fff8e1%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20style%3D%22fill%3A%23333%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%3Bfont-size%3A40px%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%E9%96%80%E7%A6%81%E6%95%85%E9%9A%9C%E5%9C%96%E7%89%87%3C%2Ftext%3E%3C%2Fsvg%3E',
      'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23fff3e0%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20style%3D%22fill%3A%23333%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%3Bfont-size%3A40px%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%E9%96%80%E7%A6%81%E6%95%85%E9%9A%9C%E7%89%B9%E5%AF%AB%3C%2Ftext%3E%3C%2Fsvg%3E',
      'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23333333%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20style%3D%22fill%3A%23ffffff%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%3Bfont-size%3A40px%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%E9%96%80%E7%A6%81%E6%95%85%E9%9A%9C%E5%BD%B1%E7%89%87%3C%2Ftext%3E%3C%2Fsvg%3E'
    ]
  },
  {
    id: '5',
    title: '前門保全人員態度不佳',
    description: '前門保全對訪客態度不佳，語氣粗魯',
    status: ReportStatus.REJECTED,
    priority: ReportPriority.LOW,
    category: ReportCategory.SERVICE,
    location: '總部大樓 1F',
    createdAt: new Date('2025-06-05T16:40:00Z'),
    updatedAt: new Date('2025-06-06T09:15:00Z'),
    creatorId: '4',
    creator: { id: '4', name: '陳志明', email: 'chen@example.com', role: 'USER' },
    images: [
      'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23ffebee%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20style%3D%22fill%3A%23333%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%3Bfont-size%3A40px%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%E4%BF%9D%E5%85%A8%E4%BA%BA%E5%93%A1%E7%85%A7%E7%89%87%3C%2Ftext%3E%3C%2Fsvg%3E',
      'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23ffcdd2%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20style%3D%22fill%3A%23333%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%3Bfont-size%3A40px%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3E%E5%89%8D%E9%96%80%E7%85%A7%E7%89%87%3C%2Ftext%3E%3C%2Fsvg%3E'
    ]
  }
];

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // 重置所有數據
  const resetData = () => {
    localStorage.setItem('oms-reports', JSON.stringify(mockReports));
    loadReports();
    alert('數據已重置');
  };

  // 從 localStorage 加載報告數據
  const loadReports = () => {
    setIsLoading(true);
    try {
      const savedReports = localStorage.getItem('oms-reports');
      
      if (savedReports) {
        // 解析 JSON 並將日期字符串轉換回 Date 對象
        const parsedReports = JSON.parse(savedReports, (key, value) => {
          if (key === 'createdAt' || key === 'updatedAt') {
            return new Date(value);
          }
          return value;
        });
        
        setReports(parsedReports);
        setFilteredReports(parsedReports);
        console.log('已加載報告數據:', parsedReports);
      } else {
        // 如果沒有保存的數據，使用模擬數據
        setReports(mockReports);
        setFilteredReports(mockReports);
        localStorage.setItem('oms-reports', JSON.stringify(mockReports));
        console.log('使用模擬數據初始化');
      }
    } catch (error) {
      console.error('加載報告數據時出錯:', error);
      setReports(mockReports);
      setFilteredReports(mockReports);
    } finally {
      setIsLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 取得狀態顏色和圖標
  const getStatusInfo = (status) => {
    switch (status) {
      case ReportStatus.UNCONFIRMED:
        return { color: 'bg-gray-100 text-gray-800', icon: <ExclamationCircleIcon className="h-3 w-3 mr-1" /> };
      case ReportStatus.PROCESSING:
        return { color: 'bg-blue-100 text-blue-800', icon: <ClockIcon className="h-3 w-3 mr-1" /> };
      case ReportStatus.PENDING_REVIEW:
        return { color: 'bg-yellow-100 text-yellow-800', icon: <ClockIcon className="h-3 w-3 mr-1" /> };
      case ReportStatus.REVIEWED:
        return { color: 'bg-green-100 text-green-800', icon: <CheckCircleIcon className="h-3 w-3 mr-1" /> };
      case ReportStatus.REJECTED:
        return { color: 'bg-red-100 text-red-800', icon: <XCircleIcon className="h-3 w-3 mr-1" /> };
      case ReportStatus.RETURNED:
        return { color: 'bg-orange-100 text-orange-800', icon: <XCircleIcon className="h-3 w-3 mr-1" /> };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: <ExclamationCircleIcon className="h-3 w-3 mr-1" /> };
    }
  };

  // 取得優先級顏色
  const getPriorityColor = (priority) => {
    switch (priority) {
      case ReportPriority.LOW:
        return 'bg-gray-100 text-gray-800';
      case ReportPriority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800';
      case ReportPriority.HIGH:
        return 'bg-orange-100 text-orange-800';
      case ReportPriority.URGENT:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 取得類別名稱
  const getCategoryName = (category, report) => {
    // 優先使用新的分層類別路徑
    if (report && report.categoryPath) {
      // 如果有類別路徑，取最後一個分層（第三層類別）
      const parts = report.categoryPath.split('/');
      if (parts.length > 0) {
        return parts[parts.length - 1]; // 返回最後一個分層名稱
      }
    }
    
    // 如果沒有類別路徑，使用舊的平面類別常量
    switch (category) {
      case ReportCategory.FACILITY:
        return '設施故障';
      case ReportCategory.SECURITY:
        return '安全問題';
      case ReportCategory.ENVIRONMENT:
        return '環境問題';
      case ReportCategory.SERVICE:
        return '服務問題';
      case ReportCategory.OTHER:
        return '其他';
      default:
        return '未分類';
    }
  };

  // 取得狀態名稱
  const getStatusName = (status) => {
    switch (status) {
      case ReportStatus.UNCONFIRMED:
        return '未確認';
      case ReportStatus.PROCESSING:
        return '處理中';
      case ReportStatus.PENDING_REVIEW:
        return '待審核';
      case ReportStatus.REVIEWED:
        return '已審核';
      case ReportStatus.REJECTED:
        return '不受理';
      case ReportStatus.RETURNED:
        return '已退回';
      default:
        return '未知狀態';
    }
  };
  
  // 初始化時加載數據
  useEffect(() => {
    loadReports();
  }, []);

  // 篩選報告
  useEffect(() => {
    const filterReports = () => {
      let filtered = [...reports];
      
      // 搜尋條件
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(report => 
          report.title.toLowerCase().includes(term) || 
          report.description.toLowerCase().includes(term) ||
          report.location.toLowerCase().includes(term)
        );
      }
      
      // 狀態篩選
      if (statusFilter) {
        filtered = filtered.filter(report => report.status === statusFilter);
      }
      
      // 類別篩選
      if (categoryFilter) {
        filtered = filtered.filter(report => report.category === categoryFilter);
      }
      
      // 優先級篩選
      if (priorityFilter) {
        filtered = filtered.filter(report => report.priority === priorityFilter);
      }
      
      // 按創建時間降序排序
      filtered.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setFilteredReports(filtered);
    };
    
    filterReports();
  }, [reports, searchTerm, statusFilter, categoryFilter, priorityFilter]);

  // 設置延遲搜尋以提高效能
  useEffect(() => {
    const timer = setTimeout(() => {
      // 已由上面的 useEffect 處理
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  return (
    <>
      <Head>
        <title>通報管理 | OMS 原型</title>
      </Head>
      
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-semibold text-gray-900">通報管理</h1>
              <div className="flex space-x-3">
                <button 
                  onClick={resetData}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  重置數據
                </button>
                <Link href="/reports/new" className="btn-primary flex items-center">
                  <PlusIcon className="h-5 w-5 mr-1" />
                  建立通報
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* 篩選和搜尋 */}
        <div className="bg-white shadow-sm rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* 搜尋 */}
            <div className="col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="form-input pl-10"
                  placeholder="搜尋通報標題或描述..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* 狀態篩選 */}
            <div>
              <select
                className="form-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">全部狀態</option>
                <option value={ReportStatus.UNCONFIRMED}>未確認</option>
                <option value={ReportStatus.PROCESSING}>處理中</option>
                <option value={ReportStatus.PENDING_REVIEW}>待審核</option>
                <option value={ReportStatus.REVIEWED}>已審核</option>
                <option value={ReportStatus.REJECTED}>不受理</option>
                <option value={ReportStatus.RETURNED}>已退回</option>
              </select>
            </div>
            
            {/* 類別篩選 */}
            <div>
              <select
                className="form-input"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">全部類別</option>
                <option value={ReportCategory.FACILITY}>設施故障</option>
                <option value={ReportCategory.SECURITY}>安全問題</option>
                <option value={ReportCategory.ENVIRONMENT}>環境問題</option>
                <option value={ReportCategory.SERVICE}>服務問題</option>
                <option value={ReportCategory.OTHER}>其他</option>
              </select>
            </div>
            
            {/* 優先級篩選 */}
            <div>
              <select
                className="form-input"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="">全部優先級</option>
                <option value={ReportPriority.LOW}>低</option>
                <option value={ReportPriority.MEDIUM}>中</option>
                <option value={ReportPriority.HIGH}>高</option>
                <option value={ReportPriority.URGENT}>緊急</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* 通報列表 */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden w-full">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredReports.length > 0 ? (
            <div className="overflow-x-auto w-full">
              <table className="w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      ID
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                      標題
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      狀態
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      類別
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      優先級
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      地點
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      建立時間
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      建立者
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/reports/${report.id}`}>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">
                        #{report.id}
                      </td>
                      <td className="px-2 py-3 whitespace-normal">
                        <div className="text-sm font-medium text-gray-900 truncate">{report.title}</div>
                        <div className="text-sm text-gray-500 truncate">{report.description}</div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusInfo(report.status).color}`}>
                          {getStatusInfo(report.status).icon}
                          {getStatusName(report.status)}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">
                        {getCategoryName(report.category, report)}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(report.priority)}`}>
                          {report.priority}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">
                        {report.location}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-ellipsis overflow-hidden">
                        {formatDate(report.createdAt)}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-ellipsis overflow-hidden">
                        {report.creator?.name || '未知'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FunnelIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">沒有符合條件的通報</h3>
              <p className="mt-1 text-sm text-gray-500">請嘗試調整篩選條件或建立新通報。</p>
              <div className="mt-6">
                <Link href="/reports/new" className="btn-primary">
                  建立通報
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
