import { useState, useRef, useEffect } from 'react';
import { Volume2, Play, Pause } from 'lucide-react';

interface Track {
  id: number;
  name: string;
  stems: {
    drums: string;
    bass: string;
    melody: string;
    vocals: string;
  };
}

interface ChannelState {
  volume: number;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
}

const TRACKS: Track[] = [
  {
    id: 1,
    name: 'TRACK_01',
    stems: {
      drums: '/audio/test.mp3',
      bass: '/audio/test.mp3',
      melody: '/audio/test.mp3',
      vocals: '/audio/test.mp3',
    }
  },
  {
    id: 2,
    name: 'TRACK_02',
    stems: {
      drums: '/audio/test2.mp3',
      bass: '/audio/test2.mp3',
      melody: '/audio/test2.mp3',
      vocals: '/audio/test2.mp3',
    }
  },
  {
    id: 3,
    name: 'TRACK_03',
    stems: {
      drums: '/audio/test3.mp3',
      bass: '/audio/test3.mp3',
      melody: '/audio/test3.mp3',
      vocals: '/audio/test3.mp3',
    }
  },
  {
    id: 4,
    name: 'TRACK_04',
    stems: {
      drums: '/audio/test4.mp3',
      bass: '/audio/test4.mp3',
      melody: '/audio/test4.mp3',
      vocals: '/audio/test4.mp3',
    }
  }
];

const STEM_NAMES = ['drums', 'bass', 'melody', 'vocals'] as const;

function App() {
  const [masterVolume, setMasterVolume] = useState(80);
  const [masterPitch, setMasterPitch] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [channels, setChannels] = useState<ChannelState[]>(
    STEM_NAMES.map(() => ({
      volume: 75,
      eqLow: 50,
      eqMid: 50,
      eqHigh: 50,
    }))
  );

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  const eqNodesRef = useRef<{ low: BiquadFilterNode; mid: BiquadFilterNode; high: BiquadFilterNode }[]>([]);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

    STEM_NAMES.forEach((stemName, index) => {
      const audio = new Audio(TRACKS[0].stems[stemName]);
      audio.loop = true;
      audio.volume = 1;
      audioElementsRef.current[index] = audio;

      audio.addEventListener('error', (e) => {
        console.error(`Error loading audio for ${stemName}:`, audio.error);
      });

      audio.addEventListener('canplay', () => {
        console.log(`Audio ready for ${stemName}`);
      });

      const source = audioContextRef.current!.createMediaElementSource(audio);
      const gainNode = audioContextRef.current!.createGain();
      const lowEQ = audioContextRef.current!.createBiquadFilter();
      const midEQ = audioContextRef.current!.createBiquadFilter();
      const highEQ = audioContextRef.current!.createBiquadFilter();

      lowEQ.type = 'lowshelf';
      lowEQ.frequency.value = 200;
      midEQ.type = 'peaking';
      midEQ.frequency.value = 1000;
      midEQ.Q.value = 1;
      highEQ.type = 'highshelf';
      highEQ.frequency.value = 3000;

      source.connect(lowEQ);
      lowEQ.connect(midEQ);
      midEQ.connect(highEQ);
      highEQ.connect(gainNode);
      gainNode.connect(audioContextRef.current!.destination);

      const initialVolume = (75 / 100) * (80 / 100);
      gainNode.gain.value = initialVolume;

      gainNodesRef.current[index] = gainNode;
      eqNodesRef.current[index] = { low: lowEQ, mid: midEQ, high: highEQ };
    });

    return () => {
      audioElementsRef.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  const toggleMasterPlay = async () => {
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
      console.log('AudioContext resumed');
    }

    audioElementsRef.current.forEach((audio, index) => {
      if (newPlayingState) {
        console.log(`Playing channel ${index + 1}`);
        audio.play().catch(err => console.error(`Play error on channel ${index + 1}:`, err));
      } else {
        audio.pause();
      }
    });
  };

  const updateChannelVolume = (channelIndex: number, value: number) => {
    const newChannels = [...channels];
    newChannels[channelIndex].volume = value;
    setChannels(newChannels);
    updateGain(channelIndex);
  };

  const updateChannelEQ = (channelIndex: number, band: 'low' | 'mid' | 'high', value: number) => {
    const newChannels = [...channels];
    const eqKey = band === 'low' ? 'eqLow' : band === 'mid' ? 'eqMid' : 'eqHigh';
    newChannels[channelIndex][eqKey] = value;
    setChannels(newChannels);

    if (eqNodesRef.current[channelIndex]) {
      const gain = (value - 50) / 5;
      eqNodesRef.current[channelIndex][band].gain.value = gain;
    }
  };

  const updateGain = (channelIndex: number) => {
    const gainNode = gainNodesRef.current[channelIndex];
    if (gainNode) {
      const channelVolume = channels[channelIndex].volume / 100;
      const masterVol = masterVolume / 100;
      gainNode.gain.value = channelVolume * masterVol;
    }
  };

  const updateAllGains = () => {
    channels.forEach((_, index) => {
      const gainNode = gainNodesRef.current[index];
      if (gainNode) {
        const channelVolume = channels[index].volume / 100;
        const masterVol = masterVolume / 100;
        gainNode.gain.value = channelVolume * masterVol;
      }
    });
  };

  const updateMasterPitch = (value: number) => {
    setMasterPitch(value);
    audioElementsRef.current.forEach(audio => {
      audio.playbackRate = 1 + (value / 100);
    });
  };

  const changeTrack = (trackIndex: number) => {
    setSelectedTrack(trackIndex);

    const wasPlaying = isPlaying;

    audioElementsRef.current.forEach((audio, index) => {
      const stemName = STEM_NAMES[index];
      audio.pause();
      audio.src = TRACKS[trackIndex].stems[stemName];
      audio.load();
      if (wasPlaying) {
        audio.play().catch(err => console.log('Play error:', err));
      }
    });
  };

  useEffect(() => {
    updateAllGains();
  }, [masterVolume]);

  return (
    <div className="min-h-screen bg-black text-white font-mono p-8">
      <div className="max-w-7xl mx-auto">
        <header className="border-4 border-white p-6 mb-8 bg-black">
          <h1 className="text-5xl font-black tracking-tighter">
            ミキサー / MIXER_4TRK
          </h1>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-xl">MASTER_VOL</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(Number(e.target.value))}
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

        <div className="grid grid-cols-4 gap-6">
          {channels.map((channel, index) => (
            <div
              key={index}
              className="border-4 border-white bg-black p-4"
            >
              <div className="border-b-4 border-white pb-4 mb-4">
                <h2 className="text-2xl font-black mb-2">CHANNEL_{index + 1}</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">VOLUME</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={channel.volume}
                    onChange={(e) => updateChannelVolume(index, Number(e.target.value))}
                    className="w-full h-32 appearance-none bg-white writing-mode-vertical"
                    orient="vertical"
                    style={{
                      writingMode: 'bt-lr',
                      WebkitAppearance: 'slider-vertical',
                      width: '100%',
                      height: '128px'
                    }}
                  />
                  <div className="text-center mt-2 font-bold">{channel.volume}</div>
                </div>

                <div className="border-t-4 border-white pt-4">
                  <div className="text-sm font-bold mb-2">EQ</div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs">LOW</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={channel.eqLow}
                        onChange={(e) => updateChannelEQ(index, 'low', Number(e.target.value))}
                        className="w-full h-2 appearance-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs">MID</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={channel.eqMid}
                        onChange={(e) => updateChannelEQ(index, 'mid', Number(e.target.value))}
                        className="w-full h-2 appearance-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs">HIGH</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={channel.eqHigh}
                        onChange={(e) => updateChannelEQ(index, 'high', Number(e.target.value))}
                        className="w-full h-2 appearance-none bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
