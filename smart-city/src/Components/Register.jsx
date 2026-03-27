import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api";
import "../Style/Register.css";
export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "CITIZEN"
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/users/register", form);

      if (res.status === 200 || res.status === 201) {
        alert("Registered Successfully ✅");
        navigate("/login");
      }

    } catch (err) {
      console.error(err);
      alert("Registration Failed ❌");
    }
  };

  return (
    
  <div className="register-container">
    <div className="register-box">
      <h1>Register</h1>

      <form onSubmit={handleRegister}>
        <input name="name" placeholder="Name" onChange={handleChange} required />
        <input name="email" placeholder="Email" onChange={handleChange} required />
        <input name="password" type="password" placeholder="Password" onChange={handleChange} required />

        <select name="role" onChange={handleChange}>
          <option value="CITIZEN">Citizen</option>
          <option value="ADMIN">Admin</option>
          <option value="EMPLOYEE">Employee</option>
        </select>

        <button type="submit">Register</button>
      </form>

      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  </div>
);
 
}