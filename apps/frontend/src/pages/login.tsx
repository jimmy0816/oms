import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { login, isAuthenticated } from '@/services/authService';
import styles from '@/styles/Login.module.css';

interface LoginFormValues {
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<LoginFormValues>({
    email: '',
    password: ''
  });
  const router = useRouter();

  // Authentication check is now handled by the ProtectedRoute component
  // No need for duplicate checks here

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    try {
      setLoading(true);
      const response = await login(formValues);

      if (response.success) {
        // Show success message
        alert('登入成功'); // Login successful
        
        // No need to redirect here, ProtectedRoute will handle it
        // Just update the loading state
        setLoading(false);
        return; // 提前返回，避免执行 finally 块中的 setLoading(false)
      } else {
        setError(response.error || '登入失敗'); // Login failed
      }
    } catch (error) {
      console.error('登入錯誤:', error); // Login error
      setError('登入過程中發生錯誤'); // An error occurred during login
    } finally {
      setLoading(false);
    }
  };

  // 創建管理員帳號
  const createAdminAccount = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      
      const response = await fetch('http://localhost:3001/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@example.com',
          name: '系統管理員',
          password: 'admin123',
          role: 'ADMIN'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('管理員帳號已創建，請使用 admin@example.com 和密碼 admin123 登入');
        // 自動填入管理員帳號
        setFormValues({
          email: 'admin@example.com',
          password: 'admin123'
        });
      } else {
        setError(data.error || '創建管理員帳號失敗');
      }
    } catch (error) {
      console.error('創建管理員帳號錯誤:', error);
      setError('創建管理員帳號過程中發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.logoContainer}>
          <h1>OMS 系統</h1>
          <h3>運維管理系統</h3>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ color: 'green', marginBottom: '15px', textAlign: 'center' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="email">電子郵件</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formValues.email}
              onChange={handleInputChange}
              required
              className={styles.input}
              placeholder="請輸入電子郵件"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">密碼</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formValues.password}
              onChange={handleInputChange}
              required
              className={styles.input}
              placeholder="請輸入密碼"
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? '登入中...' : '登入'}
          </button>
          
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button 
              type="button" 
              onClick={createAdminAccount}
              disabled={loading}
              style={{ 
                background: '#4a5568', 
                color: 'white', 
                padding: '8px 15px', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer' 
              }}
            >
              創建管理員帳號
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
