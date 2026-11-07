import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, User } from "lucide-react";
import { EVENT, isSet } from "../../config/event";
import { NAV } from "../../config/navigation";
import { ASSETS } from "../../config/assets";
import { Img  } from "../ui";
import{MiniMap} from "../ui/MiniMap";

const socialLabel = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);

export function SiteFooter() {
  const socials = Object.entries(EVENT.social).filter(([, url]) => isSet(url));

  return (
    <footer className="foot">
      <div className="wrap fgrid">
        <div>
          <div className="fbrand">
            <Img
              src={ASSETS.title2}
              alt={EVENT.name}
              className="fbrand-title"
              loading="eager"
            />
          </div>
      
          <p>{EVENT.tagline}</p>
          <h3>Organised by</h3>
          <p>
            IEEE Signal Processing Society, BMS Institute of Technology and
            Management student branch chapter.
          </p>
          {socials.length > 0 && (
            <p className="soc">
              {socials.map(([name, url]) => (
                <a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
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
          <ul>
            <li>20 November 2026: Registration closes.</li>
            <li>
              22 November 2026, 10:00 AM – 12:00 PM: Online CTF qualifier.
            </li>
            <li>27–28 November 2026: 24-hour offline challenge.</li>
          </ul>
        </div>
        <div>
  <h3>Location</h3>
  <MiniMap location={EVENT.location} />
  
</div>
        <div>
          <h3>Contact</h3>
          {isSet(EVENT.contact.email) ? (
            <a href={`mailto:${EVENT.contact.email}`}>
              <Mail size={15} /> {EVENT.contact.email}
            </a>
          ) : (
            <p>
              <Mail size={15} /> decodex26.bmsit@gmail.com
            </p>
          )}
          {/* {isSet(EVENT.contact.phone) ? (
            <a href={`tel:${EVENT.contact.phone}`}>
              <Phone size={15} /> {EVENT.contact.phone}
            </a>
          ) : (
            <p>
              <Phone size={15} /> Phone to be announced
            </p>
          )} */}
       
          <p>
            <User size={15} /> Kirthana JL
          </p>
          <a href="tel:+916364744793">
            <Phone size={15} /> +91 63647 44793
          </a>
          <p>
            <User size={15} /> Mohith K Aralikatte
          </p>{" "}
          <a href="tel:+919606802529">
            <Phone size={15} /> +91 96068 02529
          </a>
          {isSet(EVENT.facultyCoordinator) && (
            <p>Faculty coordinator: {EVENT.facultyCoordinator}</p>
          )}
        </div>
      </div>
      <div className="wrap fbar">
        <span>
          © {new Date().getFullYear()} {EVENT.organizer || EVENT.name}
        </span>
        <span>
          {isSet(EVENT.privacyUrl) && (
            <a href={EVENT.privacyUrl}>Privacy policy</a>
          )}
          {isSet(EVENT.conductUrl) && (
            <a href={EVENT.conductUrl}>Code of conduct</a>
          )}
        </span>
      </div>
    </footer>
  );
}
