import React, { useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet,  
  Animated,
  Dimensions 
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function LoadingScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800, 
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image 
        source={require('../assets/loading-icon.png')} 
        style={[
          styles.fullScreenImage, 
          { opacity: fadeAnim }
        ]}
        resizeMode="cover" 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#bbd2f0', 
  },
  fullScreenImage: {
    width: width,
    height: height,
    position: 'absolute',
  },
});