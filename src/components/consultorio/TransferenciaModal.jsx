// filepath: e:\Mockup clinica\sistema-clinica\src\components\consultorio\TransferenciaModal.jsx
import React from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Button, 
  Select,
  Space 
} from 'antd';
import { 
  SendOutlined,
  AimOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import './TransferenciaModal.css'; // Import the CSS file

const { TextArea } = Input;
const { Option } = Select;

/**
 * Modal de Transferência de Paciente
 * Componente para registrar informações sobre a transferência de um paciente para outro hospital
 */
const TransferenciaModal = ({ open, onCancel, paciente, onFinish }) => {
  const [form] = Form.useForm();

  // Lista de hospitais em Maputo
  const hospitaisMaputo = [
    'Hospital Central de Maputo',
    'Hospital Geral José Macamo',
    'Hospital Geral de Mavalane',
    'Hospital Militar de Maputo',
    'Hospital Privado de Maputo',
    'Clínica Sommerschield',
    'Hospital da Polana Caniço',
    'Hospital Psiquiátrico do Infulene',
    'Hospital de Dia 1º de Maio',
    'Outro'
  ];

  // Reset form when modal is opened or patient changes
  React.useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, paciente, form]);

  // Handle form submission
  const handleSubmit = () => {
    form.validateFields().then(values => {
      // Add timestamp and patient ID
      const transferenciaData = {
        ...values,
        dataTransferencia: new Date().toLocaleString(),
        pacienteId: paciente?.id,
      };
      
      // Call the parent component's onFinish function with the data
      onFinish(transferenciaData);
    });
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <SendOutlined style={{ color: '#1890ff', fontSize: '20px', marginRight: '10px' }} />
          <span>Transferência de Paciente - {paciente?.nome || 'Paciente'}</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnClose
      className="transferencia-modal"
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          name="motivoTransferencia"
          label="Motivo da Transferência"
          rules={[{ required: true, message: 'Por favor, informe o motivo da transferência' }]}
        >
          <TextArea 
            rows={4}
            placeholder="Descreva o motivo da transferência do paciente"
            style={{ borderRadius: '4px' }}
          />
        </Form.Item>

        <Form.Item
          name="hospitalDestino"
          label={
            <Space>
              <AimOutlined />
              <span>Hospital de Destino</span>
            </Space>
          }
          rules={[{ required: true, message: 'Por favor, selecione o hospital de destino' }]}
        >
          <Select placeholder="Selecione o hospital de destino">
            {hospitaisMaputo.map(hospital => (
              <Option key={hospital} value={hospital}>{hospital}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="outroHospital"
          label="Especifique o Hospital"
          rules={[
            ({ getFieldValue }) => ({
              required: getFieldValue('hospitalDestino') === 'Outro',
              message: 'Por favor, especifique o hospital de destino',
            }),
          ]}
          style={{ display: form.getFieldValue('hospitalDestino') === 'Outro' ? 'block' : 'none' }}
        >
          <Input 
            placeholder="Nome do hospital"
            style={{ borderRadius: '4px' }}
          />
        </Form.Item>

        <Form.Item
          name="observacoes"
          label={
            <Space>
              <FileTextOutlined />
              <span>Observações Adicionais</span>
            </Space>
          }
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
              onClick={handleSubmit}
              icon={<SendOutlined />}
            >
              Confirmar Transferência
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TransferenciaModal;
