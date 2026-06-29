import { Spinner } from 'react-bootstrap';

export interface LoaderProps {
  /** Văn bản hiển thị bên cạnh spinner. */
  label?: string;
}

/** Vùng đang tải dùng chung (căn giữa, có nhãn). */
export default function Loader({ label = 'Đang tải...' }: LoaderProps) {
  return (
    <div className="ui-loader">
      <Spinner animation="border" />
      {label && <span>{label}</span>}
    </div>
  );
}
