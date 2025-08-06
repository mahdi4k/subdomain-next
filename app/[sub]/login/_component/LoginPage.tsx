// app/[sub]/login/_component/LoginPage.tsx
import { FC } from "react";
import './LoginPage.css';

interface LoginPageProps {
  type: string; // e.g., 'car', 'bike'
}

const LoginPage: FC<LoginPageProps> = ({ type }) => {
  // Determine GIF, title, and button style based on the type
  const gifSrc = type === "car" ? "/car.svg" : "/bike.svg";
  const title = type === "car" ? "Car Login" : "Bike Login";
  const buttonClass = type === "car" ? 'carButton' : 'bikeButton';

  return (
    <div className={'container'} style={{ backgroundImage: `url(${gifSrc})` }}>
      <div className={'formWrapper'}>
        <h1 className={title}>{title}</h1>
        <form className={'form'}>
          <label htmlFor="username">Username</label>
          <input id="username" type="text" />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" />
          <button type="submit" className={`${'button'} ${buttonClass}`}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;