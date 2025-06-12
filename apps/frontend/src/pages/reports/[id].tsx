import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  ClockIcon,
  UserCircleIcon,
  MapPinIcon
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
const mockReport = {
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
  history: [
    {
      id: '1',
      reportId: '1',
      status: ReportStatus.UNCONFIRMED,
      comment: '通報已建立',
      createdAt: new Date('2025-06-09T08:30:00Z'),
      userId: '1',
      user: { id: '1', name: '李小明', role: 'USER' }
    }
  ]
};

export default function ReportDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  // 根據用戶角色設置權限
  const [userPermissions, setUserPermissions] = useState({
    canProcess: false, // process_reports 權限
    canClose: false,   // close_reports 權限
    canReview: false   // review_reports 權限
  });
  
  // 模擬用戶角色與權限
  useEffect(() => {
    // 假設當前用戶為通報處理者，有 process_reports 和 close_reports 權限
    // 在實際應用中，這裡會從用戶授權系統中獲取權限
    setUserPermissions({
      canProcess: true,  // 有處理通報權限
      canClose: true,    // 有結案通報權限
      canReview: true    // 有審核通報權限（在原型中開放所有功能）
    });
  }, []);
  
  // 處理通報狀態更新
  const updateReportStatus = async (newStatus: string, comment: string) => {
    if (!report || !id) return;
    
    setProcessing(true);
    
    try {
      // 創建新的歷程記錄
      const historyEntry = {
        id: `history-${Date.now()}`,
        reportId: report.id,
        status: newStatus,
        comment: comment,
        createdAt: new Date(),
        userId: '1', // 假設當前用戶 ID
        user: { id: '1', name: '管理員', role: 'ADMIN' } // 假設當前用戶
      };
      
      // 更新報告狀態
      const updatedReport = {
        ...report,
        status: newStatus,
        updatedAt: new Date(),
        history: [...(report.history || []), historyEntry]
      };
      
      // 如果是開始處理，添加處理人員
      if (newStatus === ReportStatus.PROCESSING) {
        updatedReport.assignee = { id: '1', name: '管理員', role: 'ADMIN' };
      }
      
      // 更新 localStorage 中的報告
      const savedReportsStr = localStorage.getItem('oms-reports');
      if (savedReportsStr) {
        const savedReports = JSON.parse(savedReportsStr);
        const updatedReports = savedReports.map((r: any) => 
          r.id === report.id ? updatedReport : r
        );
        localStorage.setItem('oms-reports', JSON.stringify(updatedReports));
      }
      
      // 更新當前頁面的報告
      setReport(updatedReport);
      
      // 顯示成功訊息
      alert(`通報狀態已更新為「${getStatusName(newStatus)}」`);
    } catch (error) {
      console.error('更新通報狀態時出錯:', error);
      alert('更新通報狀態時出錯，請稍後再試');
    } finally {
      setProcessing(false);
    }
  };
  
  // 從 localStorage 獲取通報詳情
  useEffect(() => {
    if (id) {
      try {
        // 從 localStorage 讀取全部通報
        const savedReportsStr = localStorage.getItem('oms-reports');
        
        if (savedReportsStr) {
          // 解析 JSON 並將日期字符串轉換回 Date 對象
          const savedReports = JSON.parse(savedReportsStr, (key, value) => {
            if (key === 'createdAt' || key === 'updatedAt') {
              return new Date(value);
            }
            return value;
          });
          
          // 尋找對應 ID 的通報
          const foundReport = savedReports.find((r: any) => r.id === id);
          
          if (foundReport) {
            // 確保通報有歷程記錄
            if (!foundReport.history) {
              foundReport.history = [{
                id: `history-${Date.now()}`,
                reportId: foundReport.id,
                status: foundReport.status,
                comment: '通報已建立',
                createdAt: foundReport.createdAt,
                userId: foundReport.creatorId,
                user: foundReport.creator
              }];
            }
            
            setReport(foundReport);
          } else {
            // 如果找不到對應 ID 的通報，使用模擬數據
            console.warn(`找不到 ID 為 ${id} 的通報，使用模擬數據`);
            setReport(mockReport);
          }
        } else {
          // 如果 localStorage 中沒有數據，使用模擬數據
          setReport(mockReport);
        }
      } catch (error) {
        console.error('讀取通報詳情時出錯:', error);
        setReport(mockReport);
      } finally {
        setLoading(false);
      }
    }
  }, [id]);

  // 格式化日期
  const formatDate = (dateString: Date) => {
    return dateString.toLocaleDateString('zh-TW', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // 取得狀態顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case ReportStatus.UNCONFIRMED:
        return 'bg-yellow-100 text-yellow-800';
      case ReportStatus.PROCESSING:
        return 'bg-blue-100 text-blue-800';
      case ReportStatus.PENDING_REVIEW:
        return 'bg-purple-100 text-purple-800';
      case ReportStatus.REVIEWED:
        return 'bg-green-100 text-green-800';
      case ReportStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      case ReportStatus.RETURNED:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // 取得優先級顏色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case ReportPriority.LOW:
        return 'bg-green-100 text-green-800';
      case ReportPriority.MEDIUM:
        return 'bg-blue-100 text-blue-800';
      case ReportPriority.HIGH:
        return 'bg-orange-100 text-orange-800';
      case ReportPriority.URGENT:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // 取得類別名稱
  const getCategoryName = (category: string) => {
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
  const getStatusName = (status: string) => {
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
        return '不處理';
      case ReportStatus.RETURNED:
        return '已退回';
      default:
        return '未知狀態';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-gray-900">找不到通報</h2>
        <p className="mt-2 text-gray-600">找不到 ID 為 {id} 的通報</p>
        <div className="mt-6">
          <Link href="/reports" className="btn-primary">
            返回通報列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{report.title} | 通報詳情 | OMS 原型</title>
      </Head>
      
      <div className="space-y-6">
        {/* 頁面標題與返回按鈕 */}
        <div className="flex items-center">
          <Link href="/reports" className="mr-4 p-2 rounded-full hover:bg-gray-100">
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 truncate">{report.title}</h1>
        </div>
        
        {/* 通報詳情卡片 */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {/* 通報頭部資訊 */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(report.status)}`}>
                  {getStatusName(report.status)}
                </span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(report.priority)}`}>
                  {report.priority}
                </span>
                <span className="text-sm text-gray-500">
                  通報 #{report.id}
                </span>
              </div>
              
              <div className="flex gap-2">
                {userPermissions.canProcess && report.status === ReportStatus.UNCONFIRMED && (
                  <>
                    <button 
                      className="btn-primary" 
                      onClick={() => updateReportStatus(ReportStatus.PROCESSING, '開始處理通報')}
                      disabled={processing}
                    >
                      {processing ? '處理中...' : '開始處理'}
                    </button>
                    <button 
                      className="btn-secondary"
                      onClick={() => updateReportStatus(ReportStatus.REJECTED, '此通報不處理')}
                      disabled={processing}
                    >
                      不處理
                    </button>
                  </>
                )}
                
                {userPermissions.canClose && report.status === ReportStatus.PROCESSING && (
                  <button 
                    className="btn-primary"
                    onClick={() => updateReportStatus(ReportStatus.PENDING_REVIEW, '處理完成，待審核')}
                    disabled={processing}
                  >
                    {processing ? '處理中...' : '結案'}
                  </button>
                )}
                
                {userPermissions.canReview && report.status === ReportStatus.PENDING_REVIEW && (
                  <>
                    <button 
                      className="btn-primary"
                      onClick={() => updateReportStatus(ReportStatus.REVIEWED, '審核通過')}
                      disabled={processing}
                    >
                      {processing ? '處理中...' : '審核通過'}
                    </button>
                    <button 
                      className="btn-secondary"
                      onClick={() => updateReportStatus(ReportStatus.PROCESSING, '退回重新處理')}
                      disabled={processing}
                    >
                      退回
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {/* 通報詳細資訊 */}
            <div className="mt-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">描述</h3>
                <p className="mt-1 text-gray-900 whitespace-pre-line">{report.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">類別</h3>
                  <p className="mt-1 text-gray-900">{getCategoryName(report.category)}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">地點</h3>
                  <div className="mt-1 flex items-center">
                    <MapPinIcon className="h-5 w-5 text-gray-400 mr-1" />
                    <p className="text-gray-900">{report.location}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">建立者</h3>
                  <div className="mt-1 flex items-center">
                    <UserCircleIcon className="h-5 w-5 text-gray-400 mr-1" />
                    <p className="text-gray-900">{report.creator?.name || '未知'}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">建立時間</h3>
                  <div className="mt-1 flex items-center">
                    <ClockIcon className="h-5 w-5 text-gray-400 mr-1" />
                    <p className="text-gray-900">{formatDate(report.createdAt)}</p>
                  </div>
                </div>
                
                {report.assignee && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">處理人員</h3>
                    <div className="mt-1 flex items-center">
                      <UserCircleIcon className="h-5 w-5 text-gray-400 mr-1" />
                      <p className="text-gray-900">{report.assignee.name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 通報歷程 */}
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">處理歷程</h3>
            
            <div className="flow-root">
              <ul className="-mb-8">
                {report.history.map((event: any, eventIdx: number) => (
                  <li key={event.id}>
                    <div className="relative pb-8">
                      {eventIdx !== report.history.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getStatusColor(event.status)}`}>
                            <ClockIcon className="h-5 w-5" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              {getStatusName(event.status)}
                              {event.comment && <span className="font-medium text-gray-900"> - {event.comment}</span>}
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            <div>{event.user?.name || '系統'}</div>
                            <time dateTime={event.createdAt.toISOString()}>{formatDate(event.createdAt)}</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
