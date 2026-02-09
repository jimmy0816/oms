/**
 * Google Chat Service
 * 處理 Google Chat Webhook 訊息發送
 */

interface GoogleChatCard {
  cardsV2: Array<{
    cardId?: string;
    card: {
      header?: {
        title: string;
        subtitle?: string;
      };
      sections: Array<{
        widgets: Array<any>;
      }>;
    };
  }>;
}

interface GoogleChatResponse {
  name: string; // 格式: spaces/{space}/messages/{message}
  thread?: {
    name: string; // Thread Key
  };
  space?: {
    name: string; // Space ID
  };
}

export const googleChatService = {
  /**
   * 發送訊息到 Google Chat Space (建立新 Thread)
   */
  async sendToSpace(message: GoogleChatCard): Promise<GoogleChatResponse | null> {
    const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
    const enabled = process.env.GOOGLE_CHAT_ENABLED === 'true';

    if (!enabled) {
      console.log('[Google Chat] 功能未啟用');
      return null;
    }

    if (!webhookUrl) {
      console.error('[Google Chat] GOOGLE_CHAT_WEBHOOK_URL 未設定');
      return null;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Chat API 錯誤: ${response.status} - ${errorText}`);
      }

      const data: GoogleChatResponse = await response.json();
      console.log('[Google Chat] 訊息發送成功:', data.name);
      return data;
    } catch (error: any) {
      console.error('[Google Chat] 發送失敗:', error.message);
      throw error;
    }
  },

  /**
   * 發送訊息到現有的 Thread
   * 使用簡單的 text 格式回覆到指定的討論串
   */
  async sendToThread(
    threadName: string,
    text: string
  ): Promise<GoogleChatResponse | null> {
    const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
    const enabled = process.env.GOOGLE_CHAT_ENABLED === 'true';

    if (!enabled) {
      console.log('[Google Chat] 功能未啟用');
      return null;
    }

    if (!webhookUrl) {
      console.error('[Google Chat] GOOGLE_CHAT_WEBHOOK_URL 未設定');
      return null;
    }

    try {
      // 使用簡單的 text 格式，並指定 thread.name
      const message = {
        text: text,
        thread: {
          name: threadName,
        },
      };

      console.log(`[Google Chat] 發送到 Thread: ${threadName}`);

      const replyInThreadUrl = `${webhookUrl}&messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD`;
      const response = await fetch(replyInThreadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Chat API 錯誤: ${response.status} - ${errorText}`);
      }

      const data: GoogleChatResponse = await response.json();
      console.log('[Google Chat] 訊息發送到 Thread 成功:', data.name);
      return data;
    } catch (error: any) {
      console.error('[Google Chat] 發送到 Thread 失敗:', error.message);
      throw error;
    }
  },

  /**
   * 格式化 Report 建立訊息
   */
  formatReportCreateMessage(report: any): GoogleChatCard {
    const omsUrl = process.env.PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const reportUrl = `${omsUrl}/reports/${report.id}`;

    return {
      cardsV2: [
        {
          cardId: `report-${report.id}`,
          card: {
            header: {
              title: '📋 新通報建立',
              subtitle: report.id,
            },
            sections: [
              {
                widgets: [
                  {
                    decoratedText: {
                      topLabel: '標題',
                      text: report.title,
                    },
                  },
                  {
                    decoratedText: {
                      topLabel: '描述',
                      text: report.description || '無',
                    },
                  },
                  {
                    decoratedText: {
                      topLabel: '狀態',
                      text: this.formatStatus(report.status),
                    },
                  },
                  {
                    decoratedText: {
                      topLabel: '優先度',
                      text: this.formatPriority(report.priority),
                    },
                  },
                  {
                    decoratedText: {
                      topLabel: '建立人',
                      text: report.creator?.name || '未知',
                    },
                  },
                  {
                    decoratedText: {
                      topLabel: '負責人',
                      text: report.assignee?.name || '未指派',
                    },
                  },
                  {
                    buttonList: {
                      buttons: [
                        {
                          text: '查看詳情',
                          onClick: {
                            openLink: {
                              url: reportUrl,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };
  },

  /**
   * 格式化 Report 更新訊息
   */
  formatReportUpdateMessage(report: any, changes: Record<string, any>): GoogleChatCard {
    const omsUrl = process.env.PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const reportUrl = `${omsUrl}/reports/${report.id}`;

    const changeWidgets = Object.entries(changes).map(([field, { old, new: newValue }]) => ({
      decoratedText: {
        topLabel: this.formatFieldName(field),
        text: `${this.formatValue(old)} → ${this.formatValue(newValue)}`,
      },
    }));

    return {
      cardsV2: [
        {
          cardId: `report-update-${report.id}`,
          card: {
            header: {
              title: '📝 通報已更新',
              subtitle: report.id,
            },
            sections: [
              {
                widgets: [
                  {
                    decoratedText: {
                      topLabel: '標題',
                      text: report.title,
                    },
                  },
                  ...changeWidgets,
                  {
                    buttonList: {
                      buttons: [
                        {
                          text: '查看詳情',
                          onClick: {
                            openLink: {
                              url: reportUrl,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };
  },

  /**
   * 格式化 Ticket 建立訊息
   */
  formatTicketCreateMessage(ticket: any, report: any): GoogleChatCard {
    const omsUrl = process.env.PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const ticketUrl = `${omsUrl}/tickets/${ticket.id}`;

    return {
      cardsV2: [
        {
          cardId: `ticket-${ticket.id}`,
          card: {
            header: {
              title: '🎫 工單已建立',
              subtitle: ticket.id,
            },
            sections: [
              {
                widgets: [
                  {
                    decoratedText: {
                      topLabel: '關聯通報',
                      text: report.id,
                    },
                  },
                  {
                    decoratedText: {
                      topLabel: '工單標題',
                      text: ticket.title,
                    },
                  },
                  {
                    decoratedText: {
                      topLabel: '描述',
                      text: ticket.description || '無',
                    },
                  },
                  {
                    decoratedText: {
                      topLabel: '狀態',
                      text: this.formatStatus(ticket.status),
                    },
                  },
                  {
                    decoratedText: {
                      topLabel: '優先度',
                      text: this.formatPriority(ticket.priority),
                    },
                  },
                  {
                    decoratedText: {
                      topLabel: '負責人',
                      text: ticket.assignee?.name || '未指派',
                    },
                  },
                  {
                    buttonList: {
                      buttons: [
                        {
                          text: '查看工單',
                          onClick: {
                            openLink: {
                              url: ticketUrl,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };
  },

  /**
   * 格式化 Ticket 更新訊息
   */
  formatTicketUpdateMessage(
    ticket: any,
    report: any,
    changes: Record<string, any>
  ): GoogleChatCard {
    const omsUrl = process.env.PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const ticketUrl = `${omsUrl}/tickets/${ticket.id}`;

    const changeWidgets = Object.entries(changes).map(([field, { old, new: newValue }]) => ({
      decoratedText: {
        topLabel: this.formatFieldName(field),
        text: `${this.formatValue(old)} → ${this.formatValue(newValue)}`,
      },
    }));

    return {
      cardsV2: [
        {
          cardId: `ticket-update-${ticket.id}`,
          card: {
            header: {
              title: '🔄 工單已更新',
              subtitle: ticket.id,
            },
            sections: [
              {
                widgets: [
                  {
                    decoratedText: {
                      topLabel: '關聯通報',
                      text: report.id,
                    },
                  },
                  {
                    decoratedText: {
                      topLabel: '工單標題',
                      text: ticket.title,
                    },
                  },
                  ...changeWidgets,
                  {
                    buttonList: {
                      buttons: [
                        {
                          text: '查看工單',
                          onClick: {
                            openLink: {
                              url: ticketUrl,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };
  },

  /**
   * 格式化狀態顯示
   */
  formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      UNCONFIRMED: '❓ 未確認',
      CONFIRMED: '✅ 已確認',
      IN_PROGRESS: '🔄 處理中',
      RESOLVED: '✔️ 已解決',
      CLOSED: '🔒 已關閉',
      PENDING: '⏳ 待處理',
      REJECTED: '❌ 已拒絕',
    };
    return statusMap[status] || status;
  },

  /**
   * 格式化優先度顯示
   */
  formatPriority(priority: string): string {
    const priorityMap: Record<string, string> = {
      LOW: '🟢 低',
      MEDIUM: '🟡 中',
      HIGH: '🔴 高',
      URGENT: '🚨 緊急',
    };
    return priorityMap[priority] || priority;
  },

  /**
   * 格式化欄位名稱
   */
  formatFieldName(field: string): string {
    const fieldMap: Record<string, string> = {
      status: '狀態',
      priority: '優先度',
      assigneeId: '負責人',
      title: '標題',
      description: '描述',
      reportIds: '關聯通報',
      locationId: '地點',
      categoryId: '分類',
      contactPhone: '聯絡電話',
      contactEmail: '聯絡信箱',
    };
    return fieldMap[field] || field;
  },

  /**
   * 格式化值顯示
   */
  formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '無';
    }
    if (typeof value === 'object') {
      return value.name || value.id || JSON.stringify(value);
    }
    return String(value);
  },

  /**
   * 格式化 Report 更新的 text 訊息
   */
  formatReportUpdateText(report: any, changes: Record<string, any>): string {
    const omsUrl = process.env.PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const reportUrl = `${omsUrl}/reports/${report.id}`;

    let text = `📝 *通報已更新*\n`;
    text += `通報編號: ${report.id}\n`;
    text += `標題: ${report.title}\n\n`;
    text += `*變更內容:*\n`;

    for (const [field, { old, new: newValue }] of Object.entries(changes)) {
      const fieldName = this.formatFieldName(field);
      const oldFormatted = this.formatValue(old);
      const newFormatted = this.formatValue(newValue);
      text += `• ${fieldName}: ${oldFormatted} → ${newFormatted}\n`;
    }

    text += `\n查看詳情: ${reportUrl}`;
    return text;
  },

  /**
   * 格式化 Ticket 建立的 text 訊息
   */
  formatTicketCreateText(ticket: any, report: any): string {
    const omsUrl = process.env.PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const ticketUrl = `${omsUrl}/tickets/${ticket.id}`;

    let text = `🎫 *工單已建立*\n`;
    text += `工單編號: ${ticket.id}\n`;
    text += `關聯通報: ${report.id}\n`;
    text += `標題: ${ticket.title}\n`;
    text += `狀態: ${this.formatStatus(ticket.status)}\n`;
    text += `優先度: ${this.formatPriority(ticket.priority)}\n`;
    text += `負責人: ${ticket.assignee?.name || '未指派'}\n`;
    text += `\n查看工單: ${ticketUrl}`;
    return text;
  },

  /**
   * 格式化 Ticket 更新的 text 訊息
   */
  formatTicketUpdateText(ticket: any, report: any, changes: Record<string, any>): string {
    const omsUrl = process.env.PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const ticketUrl = `${omsUrl}/tickets/${ticket.id}`;

    let text = `🔄 *工單已更新*\n`;
    text += `工單編號: ${ticket.id}\n`;
    text += `關聯通報: ${report.id}\n`;
    text += `標題: ${ticket.title}\n\n`;
    text += `*變更內容:*\n`;

    for (const [field, { old, new: newValue }] of Object.entries(changes)) {
      const fieldName = this.formatFieldName(field);
      const oldFormatted = this.formatValue(old);
      const newFormatted = this.formatValue(newValue);
      text += `• ${fieldName}: ${oldFormatted} → ${newFormatted}\n`;
    }

    text += `\n查看工單: ${ticketUrl}`;
    return text;
  },

  /**
   * 格式化 Ticket 刪除的 text 訊息
   */
  formatTicketDeleteText(ticket: any, report: any): string {
    const omsUrl = process.env.PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const reportUrl = `${omsUrl}/reports/${report.id}`;

    let text = `🗑️ *工單已刪除*\n`;
    text += `工單編號: ${ticket.id}\n`;
    text += `關聯通報: ${report.id}\n`;
    text += `標題: ${ticket.title}\n`;
    text += `狀態: ${this.formatStatus(ticket.status)}\n`;
    text += `優先度: ${this.formatPriority(ticket.priority)}\n`;
    text += `\n查看通報: ${reportUrl}`;
    return text;
  },
};
