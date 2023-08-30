import Image from "next/image";
import {
  LoginButton,
  LogoutButton,
  ProfileButton,
  RegisterButton,
} from "@/components/buttons.component";
import Navbar from "@/components/navbar";

export default function Home() {
  return (
    <main className="h-full w-full">
      <Navbar />
      <main
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "70vh",
        }}
      >
        <div>
          <LoginButton />
          <RegisterButton />
          <LogoutButton />
          <ProfileButton />
        </div>
      </main>
    </main>
  );
}
