import AccountPrototype from "@/components/AccountPrototype";

export default function AccountsPage() {
  return (
    <>
      <section className="page-intro">
        <h1>Accounts</h1>
        <p className="lede">
          Users can register and log in through this interface. It is wired as a front-end
          prototype and ready to connect to a real authentication backend.
        </p>
      </section>

      <AccountPrototype />
    </>
  );
}