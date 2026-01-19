import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './utils/localStorageMonitor'; // ⚠️ MONITOR DE DEBUG - Carregar PRIMEIRO
import './services/axiosConfig'; // Import axios config
import 'antd/dist/reset.css'; // (se estiver usando Ant Design)


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* <ClinicProvider> */}
      <App />
    {/* </ClinicProvider> */}
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
