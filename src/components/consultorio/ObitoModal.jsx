// filepath: e:\Mockup clinica\sistema-clinica\src\components\consultorio\ObitoModal.jsx
import React from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Button, 
  DatePicker, 
  Space, 
  TimePicker
} from 'antd';
import { 
  StopOutlined,
  CalendarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';
import './ObitoModal.css'; // Import the CSS file

const { TextArea } = Input;

/**
 * Modal de Declaração de Óbito
 * Componente para registrar informações sobre o óbito de um paciente
 */
const ObitoModal = ({ open, onCancel, paciente, onFinish }) => {
  const [form] = Form.useForm();

  // Reset form when modal is opened or patient changes
  React.useEffect(() => {
    if (open) {
      form.resetFields();
      // Set default values for date and time
      form.setFieldsValue({
        dataObito: moment(),
        horaObito: moment(),
      });
    }
  }, [open, paciente, form]);

  // Handle form submission
  const handleSubmit = () => {
    form.validateFields().then(values => {
      // Format the date and time for submission
      const dataObitoFormatada = values.dataObito.format('DD/MM/YYYY');
      const horaObitoFormatada = values.horaObito.format('HH:mm');
      
      // Combine the data into a single object
      const obitoData = {
        ...values,
        dataObitoFormatada,
        horaObitoFormatada,
        dataObito: new Date().toLocaleString(), // For compatibility with existing code
        pacienteId: paciente?.id,
      };
      
      // Call the parent component's onFinish function with the data
      onFinish(obitoData);
    });
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <StopOutlined style={{ color: '#ff4d4f', fontSize: '20px', marginRight: '10px' }} />
          <span>Declaração de Óbito - {paciente?.nome || 'Paciente'}</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnClose
      className="obito-modal"
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          name="causaMorte"
          label="Causa da Morte"
          rules={[{ required: true, message: 'Por favor, informe a causa da morte' }]}
        >
          <TextArea 
            rows={4}
            placeholder="Descreva a causa da morte do paciente"
            style={{ borderRadius: '4px' }}
          />
        </Form.Item>

        <Form.Item
          name="dataObito"
          label={
            <Space>
              <CalendarOutlined />
              <span>Data do Óbito</span>
            </Space>
          }
          rules={[{ required: true, message: 'Por favor, informe a data do óbito' }]}
        >
          <DatePicker 
            style={{ width: '100%' }} 
            format="DD/MM/YYYY"
            placeholder="Selecione a data"
          />
        </Form.Item>

        <Form.Item
          name="horaObito"
          label={
            <Space>
              <ClockCircleOutlined />
              <span>Hora do Óbito</span>
            </Space>
          }
          rules={[{ required: true, message: 'Por favor, informe a hora do óbito' }]}
        >
          <TimePicker 
            style={{ width: '100%' }} 
            format="HH:mm"
            placeholder="Selecione a hora"
          />
        </Form.Item>

        <Form.Item
          name="observacoes"
          label="Observações Adicionais"
        >
          <TextArea 
            rows={3}
            placeholder="Observações adicionais (opcional)"
            style={{ borderRadius: '4px' }}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onCancel}>
              Cancelar
            </Button>
            <Button 
              type="primary" 
              danger
              onClick={handleSubmit}
              icon={<StopOutlined />}
            >
              Confirmar Óbito
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ObitoModal;
