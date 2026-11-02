import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Calendar, Laptop, User } from "lucide-react";
import { EVENT, TBA, isSet } from "../../config/event";
import { NAV } from "../../config/navigation";

const socialLabel = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);

export function SiteFooter() {
  const socials = Object.entries(EVENT.social).filter(([, url]) => isSet(url));
  const organizer = [EVENT.organizer, EVENT.college].filter(isSet).join(", ");

  return (
    <footer className="foot">
      <div className="wrap fgrid">
        <div>
          <b className="fname">{EVENT.name}</b>
          <p>
            {EVENT.edition ? `${EVENT.edition} · ` : ""}
            {EVENT.tagline}
          </p>
          <p>{organizer ? `Organised by ${organizer}.` : "Organizing details to be announced."}</p>
          {socials.length > 0 && (
            <p className="soc">
              {socials.map(([name, url]) => (
                <a key={name} href={url} target="_blank" rel="noopener noreferrer">
                  {socialLabel(name)}
                </a>
              ))}
            </p>
          )}
        </div>
        <div>
          <h3>Quick links</h3>
          {NAV.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
          <Link to="/register">Register</Link>
        </div>
        <div>
          <h3>Event details</h3>
          <p>
            <Calendar size={15} /> {TBA(EVENT.dateLabel, "Date")}
          </p>
          <p>
            <MapPin size={15} /> {TBA(EVENT.venue, "Venue")}
          </p>
          <p>
            <Laptop size={15} /> {TBA(EVENT.mode, "Mode")}
          </p>
          {isSet(EVENT.department) && <p>{EVENT.department}</p>}
        </div>
        <div>
          <h3>Contact</h3>
          {isSet(EVENT.contact.email) ? (
            <a href={`mailto:${EVENT.contact.email}`}>
              <Mail size={15} /> {EVENT.contact.email}
            </a>
          ) : (
            <p>
              <Mail size={15} /> Email to be announced
            </p>
          )}
          {isSet(EVENT.contact.phone) ? (
            <a href={`tel:${EVENT.contact.phone}`}>
              <Phone size={15} /> {EVENT.contact.phone}
            </a>
          ) : (
            <p>
              <Phone size={15} /> Phone to be announced
            </p>
          )}
          {isSet(EVENT.contact.person) && (
            <p>
              <User size={15} /> {EVENT.contact.person}
            </p>
          )}
          {isSet(EVENT.facultyCoordinator) && <p>Faculty coordinator: {EVENT.facultyCoordinator}</p>}
        </div>
      </div>
      <div className="wrap fbar">
        <span>
          © {new Date().getFullYear()} {EVENT.organizer || EVENT.name}
        </span>
        <span>
          {isSet(EVENT.privacyUrl) && <a href={EVENT.privacyUrl}>Privacy policy</a>}
          {isSet(EVENT.conductUrl) && <a href={EVENT.conductUrl}>Code of conduct</a>}
        </span>
      </div>
    </footer>
  );
}
