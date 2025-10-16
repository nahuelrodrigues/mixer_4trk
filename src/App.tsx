import { useState, useRef, useEffect } from 'react';
import { Volume2, Play, Pause } from 'lucide-react';

interface Track {
  id: number;
  name: string;
  src: string; // ahora solo 1 audio por track
}

interface ChannelState {
  volume: number;
}

const TRACKS: Track[] = [
  { id: 1, name: 'TRACK_01', src: '/audio/track1.mp3' },
  { id: 2, name: 'TRACK_02', src: '/audio/track2.mp3' },
  { id: 3, name: 'TRACK_03', src: '/audio/track3.mp3' },
  { id: 4, name: 'TRACK_04', src: '/audio/track4.mp3' },
];

function App() {
  const [masterVolume, setMasterVolume] = useState(80);
  const [masterPitch, setMasterPitch] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [channels, setChannels] = useState<ChannelState[]>([{ volume: 75 }]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audio = new Audio(TRACKS[selectedTrack].src);
    audio.loop = true;
    audio.volume = 1;

    audio.addEventListener('error', (e) => {
      console.error(`Error loading audio:`, audio.error);
    });

    audio.addEventListener('canplay', () => {
      console.log(`Audio ready`);
    });

    const source = audioContextRef.current!.createMediaElementSource(audio);
    const gainNode = audioContextRef.current!.createGain();
    gainNode.gain.value = (channels[0].volume / 100) * (masterVolume / 100);
    source.connect(gainNode);
    gainNode.connect(audioContextRef.current!.destination);

    audioElementRef.current = audio;
    gainNodeRef.current = gainNode;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [selectedTrack]);

  const toggleMasterPlay = async () => {
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
      console.log('AudioContext resumed');
    }

    if (newPlayingState) {
      audioElementRef.current?.play().catch(err => console.error('Play error:', err));
    } else {
      audioElementRef.current?.pause();
    }
  };

  const updateChannelVolume = (value: number) => {
    const newChannels = [{ volume: value }];
    setChannels(newChannels);

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = (value / 100) * (masterVolume / 100);
    }
  };

  const updateMasterPitch = (value: number) => {
    setMasterPitch(value);
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = 1 + value / 100;
    }
  };

  const changeTrack = (trackIndex: number) => {
    setSelectedTrack(trackIndex);
    if (isPlaying) {
      setTimeout(() => {
        audioElementRef.current?.play().catch(err => console.error('Play error:', err));
      }, 50);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono p-8">
      <div className="max-w-7xl mx-auto">
        <header className="border-4 border-white p-6 mb-8 bg-black">
          <h1 className="text-5xl font-black tracking-tighter">UTSU</h1>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-xl">MASTER_VOL</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVolume}
                  onChange={(e) => {
                    setMasterVolume(Number(e.target.value));
                    updateChannelVolume(channels[0].volume);
                  }}
                  className="flex-1 h-3 appearance-none bg-white"
                />
                <span className="text-xl w-16 text-right">{masterVolume}</span>
                <Volume2 className="w-8 h-8" />
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xl">PITCH_BEND</span>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={masterPitch}
                  onChange={(e) => updateMasterPitch(Number(e.target.value))}
                  className="flex-1 h-3 appearance-none bg-white"
                />
                <span className="text-xl w-16 text-right">
                  {masterPitch > 0 ? '+' : ''}{masterPitch}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4">
              <button
                onClick={toggleMasterPlay}
                className="border-4 border-white px-8 py-4 bg-white text-black hover:bg-black hover:text-white transition-colors flex items-center gap-3 text-xl font-black"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-8 h-8" />
                    STOP
                  </>
                ) : (
                  <>
                    <Play className="w-8 h-8" />
                    PLAY
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 border-t-4 border-white pt-4">
            <div className="text-sm font-bold mb-3">TRACK_SELECT</div>
            <div className="grid grid-cols-4 gap-3">
              {TRACKS.map((track, index) => (
                <button
                  key={track.id}
                  onClick={() => changeTrack(index)}
                  className={`border-4 p-4 font-black text-lg transition-colors ${
                    selectedTrack === index
                      ? 'border-white bg-white text-black'
                      : 'border-white bg-black text-white hover:bg-white hover:text-black'
                  }`}
                >
                  {track.name}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="border-4 border-white bg-black p-4 w-48">
          <div>
            <label className="block text-sm font-bold mb-2">VOLUME</label>
            <input
              type="range"
              min="0"
              max="100"
              value={channels[0].volume}
              onChange={(e) => updateChannelVolume(Number(e.target.value))}
              className="w-full h-32 appearance-none bg-white"
            />
            <div className="text-center mt-2 font-bold">{channels[0].volume}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
