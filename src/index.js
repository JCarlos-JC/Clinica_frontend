import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import 'antd/dist/reset.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './services/axiosConfig'; // Import axios config
import { startClinicalRealtime, stopClinicalRealtime } from './services/clinicalRealtime';


startClinicalRealtime();
window.addEventListener('auth:login', () => startClinicalRealtime());
window.addEventListener('auth:expired', () => stopClinicalRealtime());

const root = ReactDOM.createRoot(document.getElementById('root'));
const clinicTheme = {
  token: {
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorInfo: '#1890ff',
    colorError: '#dc2626',
    colorText: '#333',
    colorTextSecondary: '#666',
    colorBgLayout: '#f3f4f6',
    colorBorder: '#d9d9d9',
    borderRadius: 6,
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  },
  components: {
    Button: {
      primaryShadow: '0 2px 0 rgba(5, 145, 255, 0.1)',
    },
    Card: {
      borderRadiusLG: 8,
    },
    Tabs: {
      inkBarColor: '#1890ff',
      itemSelectedColor: '#1890ff',
      itemHoverColor: '#40a9ff',
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: '#333',
      rowHoverBg: '#fafafa',
    },
  },
};

root.render(
  <React.StrictMode>
    <ConfigProvider theme={clinicTheme}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
