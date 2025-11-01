import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { logoutUser } from "../../firebase/authService";
import { getBaseUrl } from "../../../utils/domainRedirect";

const UserMenu = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const result = await logoutUser();
      if (result.success) {
        // Có thể thêm xử lý sau khi đăng xuất thành công nếu cần
        navigate("/login");
      } else {
        console.error("Lỗi đăng xuất:", result.error);
      }
    } catch (error) {
      console.error("Lỗi không mong muốn khi đăng xuất:", error);
    }
  };

  return (
    <div className="relative">
      {/* Use relative paths for internal links */}
      <Link to="/profile" className="...">
        {/* If you need an absolute URL for an image */}
        <img
          src={user.photoURL || `${getBaseUrl()}/assets/default-avatar.png`}
          alt="User avatar"
          className="..."
        />
        {/* ... */}
      </Link>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default UserMenu;
