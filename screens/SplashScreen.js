import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import { Video } from 'expo-av';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const videoRef = useRef(null);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    // Função para lidar com o fim do vídeo
    const handleVideoEnd = () => {
      navigation.replace('Welcome');
    };

    // Configurar o vídeo quando o componente for montado
    const loadVideo = async () => {
      try {
        if (videoRef.current) {
          await videoRef.current.loadAsync(
            require('../Splash/splash.mp4'),
            { shouldPlay: true, isLooping: false }
          );

          // Adicionar evento para detectar quando o vídeo terminar
          videoRef.current.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              handleVideoEnd();
            }
          });
        }
      } catch (error) {
        console.error('Erro ao carregar o vídeo:', error);
        setVideoError(true);
        // Se houver erro, ir para a tela de login após um pequeno delay
        setTimeout(handleVideoEnd, 2000);
      }
    };

    loadVideo();

    // Configurar um timeout de segurança para garantir que o app não fique preso na splash
    const timeout = setTimeout(handleVideoEnd, 10000); // 10 segundos de timeout

    return () => {
      // Limpar o timeout quando o componente for desmontado
      clearTimeout(timeout);
      if (videoRef.current) {
        videoRef.current.unloadAsync();
      }
    };
  }, [navigation]);

  // Se houver erro no vídeo, mostrar uma imagem estática como fallback
  if (videoError) {
    return (
      <View style={styles.container}>
        <Image 
          source={require('../assets/images/icon.png')} 
          style={styles.fallbackImage} 
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        style={styles.video}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width,
    height,
    position: 'absolute',
  },
  fallbackImage: {
    width: width * 0.7,
    height: height * 0.3,
  }
});
