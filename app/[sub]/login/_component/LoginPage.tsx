import { FC } from "react";
import './LoginPage.css';

interface LoginPageProps {
  type: string; // 'car' | 'bike' | 'bus'
}

const LoginPage: FC<LoginPageProps> = ({ type }) => {
  const config = {
    car: {
      gifSrc: "/car.svg",
      title: "Car Login",
      buttonClass: "carButton",
    },
    bike: {
      gifSrc: "/bike.svg",
      title: "Bike Login",
      buttonClass: "bikeButton",
    },
    bus: {
      gifSrc: "/bus.svg",
      title: "Bus Login",
      buttonClass: "busButton",
    },
  };

  const fallback = {
    gifSrc: "/bike.svg",
    title: "Login",
    buttonClass: "defaultButton",
  };

  const { gifSrc, title, buttonClass } = config[type as keyof typeof config] ?? fallback;

  return (
    <div className="container" style={{ backgroundImage: `url(${gifSrc})` }}>
      <div className="formWrapper">
        <h1>{title}</h1>
        <form className="form">
          <label htmlFor="username">Username</label>
          <input id="username" type="text" />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" />
          <button type="submit" className={`button ${buttonClass}`}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
