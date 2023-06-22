import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { getMsgsRoute, sendMsgRoute, addMoodRoute, getMoodRoute } from '../../utils/APIRoutes';
import { FaPaperPlane, FaSmile } from 'react-icons/fa';
import './style.css';
import { useNavigate } from 'react-router-dom';

export default function Messages({ curUser, curChat, socket }) {
  const [msg, setMsg] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [arrivalMsgs, setArrivalMsgs] = useState([]);
  const [isMoodButtonClicked, setIsMoodButtonClicked] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [userMood, setUserMood] = useState('');
  const navigate = useNavigate();
  const scrollRef = useRef();

  async function fetchData() {
    if (curChat) {
      try {
        const res = await axios.post(getMsgsRoute, {
          from: curUser.email,
          to: curChat.email,
        });
        if (res.data.status === false) {
          localStorage.clear();
          navigate('/login');
        }
        setMsgs(res.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    }
  }

  useEffect(() => {
    fetchData();
  }, [curChat]);

  async function handleSend(e) {
    e.preventDefault();
    if (msg.length > 0) {
      try {
        const res = await axios.post(sendMsgRoute, {
          from: curUser.email,
          to: curChat.email,
          message: msg, // Include the selected mood number in the message
          createdAt: Date.now(),
        });
        if (res.data.status === false) {
          localStorage.clear();
          navigate('/login');
        }
        socket.current.emit('send-msg', {
          to: curChat.email,
          from: curUser.email,
          type: 'text',
          message: msg, // Include the selected mood number in the message
        });
        const newMsg = { fromSelf: true, message: msg };
        setMsgs((prevMsgs) => [...prevMsgs, newMsg]);
        setMsg('');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }

  useEffect(() => {
    if (socket.current) {
      socket.current.on('msg-recieved', (msg) => {
        if (msg.type === 'text') {
          setArrivalMsgs((prevArrivalMsgs) => [...prevArrivalMsgs, msg]);
        }
      });
    }
  }, [socket.current]);

  useEffect(() => {
    setMsgs((prevMsgs) => [...prevMsgs, ...arrivalMsgs]);
    setArrivalMsgs([]);
  }, [arrivalMsgs]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const handleMoodButtonClick = () => {
    setIsMoodButtonClicked((prevState) => !prevState);
  };

  const handleEmojiSelect = (emoji) => {
    const emojiOptions = ['🙂', '😃', '😊', '😄', '😍', '😎'];
    const moodOptions = ['1', '2', '3', '4', '5', '6'];
    const index = emojiOptions.indexOf(emoji);
    if (index !== -1) {
      const selectedMood = moodOptions[index];
      setSelectedEmoji(emoji);
      setIsMoodButtonClicked(false);
      setSelectedMood(selectedMood);

      // Call the addMood function to make the API call
      addMood(selectedMood);
    }
  };

  const addMood = async (mood) => {
    try {
      const res = await axios.post(addMoodRoute, {
        sender_mail: curUser.email,
        receiver_mail: curChat.email,
        mood_id: mood,
      });
      if (res.data.status === false) {
        localStorage.clear();
        navigate('/login');
      }
      // Handle the response if needed
    } catch (error) {
      console.error('Error adding mood:', error);
    }
  };

  const fetchMood = async () => {
    try {
      const res = await axios.post(getMoodRoute, {
        sender_mail: curUser.email,
        receiver_mail: curChat.email,
      });
      if (res.data.status === false) {
        localStorage.clear();
        navigate('/login');
      }
      setUserMood(res.data.mood);
    } catch (error) {
      console.error('Error fetching mood:', error);
    }
  };

  useEffect(() => {
    fetchMood();
  }, [curChat]);

  const renderRadialMenu = () => {
    if (isMoodButtonClicked) {
      const emojiOptions = ['🙂', '😃', '😊', '😄', '😍', '😎'];

      const menuItems = emojiOptions.map((option, index) => (
        <button
          key={index}
          onClick={() => handleEmojiSelect(option)}
          className="radial-menu-item"
          style={{
            transform: `rotate(${(90 / emojiOptions.length) * index}deg) translateY(-100px) rotate(-${(90 / emojiOptions.length) * index}deg)`,
          }}
        >
          {option}
        </button>
      ));

      return (
        <div className="radial-menu">
          {menuItems}
        </div>
      );
    }
  };

  return (
    <div className="messages-container">
      {curChat && (
        <div className="message-area">
          <div className="messages scroll-style">
            <div ref={scrollRef}>
              {msgs.map((message) => (
                <div key={message.id ?? uuidv4()}>
                  <div
                    className={`message ${message.fromSelf ? 'sent' : 'received'}`}
                  >
                    <p className="message-text">{message.message}</p>
                    {message.time && (
                      <div className="message-date">
                        <p>
                          {new Date(parseInt(message.time)).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {renderRadialMenu()} {/* Render the radial menu */}
          <form className="message-form" onSubmit={handleSend}>
            <button
              className="mood-btn"
              type="button"
              onClick={handleMoodButtonClick}
            >
              <FaSmile />
            </button>
            <input
              className="message-input"
              type="text"
              placeholder="Enter Message"
              name="message"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
            />
            <button className="message-btn" type="submit">
              <FaPaperPlane />
            </button>
          </form>
        </div>
      )}
      {userMood && (
        <div className="user-mood">
          <p>Your current mood: {userMood}</p>
        </div>
      )}
    </div>
  );
}
