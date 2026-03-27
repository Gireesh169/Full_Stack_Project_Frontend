import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api";
import "../Style/Login.css";
export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const res = await API.post("/users/login", form);

      const user = res.data;

      localStorage.setItem("user", JSON.stringify(user));
      if (user.role === "ADMIN") {
        navigate("/admin-dashboard");
      } else if (user.role === "EMPLOYEE") {
        navigate("/employee-dashboard");
      } else {
        navigate("/citizen-dashboard");
      }

    } catch (err) {
      console.error(err);
      alert("Invalid Credentials ❌");
    }
  };

  return (
    <div className="login">
      <h1>Login</h1>

      <form onSubmit={handleLogin}>
        <input
          name="email"
          type="email"
          placeholder="Email"
          onChange={handleChange}
          required
        />
        <br />
        <input
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
          required
        />
        <br />
        <button type="submit">Login</button>
      </form>

      <h3>
        Don't have an account?{" "}
        <Link to="/register">Sign up</Link>
      </h3>
    </div>
  );
}