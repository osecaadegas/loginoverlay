import './Footer.css';
import overlayConfig from '../../config/overlayConfig';

const Footer = () => {
  const { showChat } = overlayConfig.twitch;
  const { channelName, chatParent } = overlayConfig.twitch;

  if (!showChat) {
    return null;
  }

  const chatUrl = `https://www.twitch.tv/embed/${channelName}/chat?parent=${chatParent}&darkpopout`;

  return (
    <footer className="footer">
      <div className="footer-content">
        <h3 className="footer-title">Chat</h3>
        <iframe
          className="twitch-chat"
          src={chatUrl}
          title="Twitch Chat"
        >
        </iframe>
      </div>
    </footer>
  );
};

export default Footer;
