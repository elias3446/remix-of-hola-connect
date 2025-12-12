import { MandatoryPasswordChange } from "@/components/auth/MandatoryPasswordChange";
import { useNavigate } from "react-router-dom";

const ChangePassword = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/bienvenida");
  };

  return (
    <div className="min-h-screen bg-background overflow-y-auto flex items-center justify-center p-4">
      <MandatoryPasswordChange onSuccess={handleSuccess} />
    </div>
  );
};

export default ChangePassword;
