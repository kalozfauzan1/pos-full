import { AuthProvider } from './context/AuthContext';
import App from './App';

export default function Main() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
