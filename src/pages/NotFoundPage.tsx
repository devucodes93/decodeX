import { Link } from "react-router-dom";
import { PrimaryButton, SecondaryButton } from "../components/ui";
import { useTitle } from "../hooks";
import { TitleArt } from "../components/ui/TitleArt";

export default function NotFoundPage() {
  useTitle("Page not found");
  return (
    <section className="status dark nf">
      <div className="grain" aria-hidden="true" />
      <div className="wrap narrow center">
        <p className="kicker">404</p>
        <h1 className="big">
          <TitleArt text="Page not found" size="page" />
        </h1>
        <p className="lede">
          The page you are looking for may have moved or no longer exists. You can return to the
          homepage or continue to the event information.
        </p>
        <div className="cta-row center">
          <PrimaryButton to="/">Back to home</PrimaryButton>
          <SecondaryButton to="/collaboration">View collaboration</SecondaryButton>
        </div>
        <p className="note">
          Looking for something else? <Link className="lnk" to="/faq">Read the FAQ</Link>.
        </p>
      </div>
    </section>
  );
}
