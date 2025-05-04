import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import MapView, { Marker, Circle, Polygon, Polyline } from 'react-native-maps';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

export default function BrandInfoScreen() {
  const {
    adresse,
    brandsted,
    farer,
    ekstraInfo,
    lat,
    lng
  } = useLocalSearchParams();

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  const [windSpeed, setWindSpeed] = useState(null);
  const [windDirection, setWindDirection] = useState(null);
  const [userLocation, setUserLocation] = useState({ latitude: latitude + 0.003, longitude });
  const [zoneStatus, setZoneStatus] = useState("Beregner...");
  const [lastZone, setLastZone] = useState("");

  const router = useRouter();

  const hasDanger = farer &&
    farer.trim() !== "" &&
    farer.trim().toLowerCase() !== "ingen" &&
    farer.trim().toLowerCase() !== "ingen farlige stoffer" &&
    farer.trim().toLowerCase() !== "ingen farer";

  const [sound, setSound] = useState();
  useEffect(() => {
    Audio.Sound.createAsync(
      require('../../assets/beep.mp3')
    ).then(({ sound }) => {
      setSound(sound);
    });
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, []);

  // Fetch wind data initially and every 5 minutes
  const fetchWindData = () => {
    fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude}&lon=${longitude}`)
      .then(res => res.json())
      .then(data => {
        const wind = data.properties.timeseries[0].data.instant.details;
        setWindSpeed(wind.wind_speed);
        setWindDirection(wind.wind_from_direction);
        console.log("Updated wind data:", wind.wind_speed, wind.wind_from_direction);
      })
      .catch(err => console.error("Fejl ved hentning af vejrdata", err));
  };

  useEffect(() => {
    fetchWindData();
    const interval = setInterval(fetchWindData, 5 * 60 * 1000); // every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Simulate moving firetruck
  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      const offsetLat = 0.003 * Math.sin(step / 10);
      const offsetLng = 0.003 * Math.cos(step / 10);
      setUserLocation({
        latitude: latitude + offsetLat,
        longitude: longitude + offsetLng
      });
      step++;
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const angleRad = windDirection ? (windDirection - 90) * (Math.PI / 180) : 0;

  const getWindSpreadPolygon = () => {
    if (!windDirection || !windSpeed || !hasDanger) return [];
    const baseDistance = 0.002;
    const maxDistance = 0.008;
    const distance = Math.min(baseDistance * windSpeed, maxDistance);
    const frontLat = latitude + distance * Math.cos(angleRad);
    const frontLng = longitude + distance * Math.sin(angleRad);
    const spreadAngle = 15 * (Math.PI / 180);
    const leftLat = latitude + distance * Math.cos(angleRad - spreadAngle);
    const leftLng = longitude + distance * Math.sin(angleRad - spreadAngle);
    const rightLat = latitude + distance * Math.cos(angleRad + spreadAngle);
    const rightLng = longitude + distance * Math.sin(angleRad + spreadAngle);
    return [
      { latitude, longitude },
      { latitude: leftLat, longitude: leftLng },
      { latitude: rightLat, longitude: rightLng }
    ];
  };

  const polygonCoords = getWindSpreadPolygon();

  const getWindArrow = () => {
    if (!windDirection || !windSpeed || !hasDanger) return [];
    const lineLength = 0.0065;
    return [
      { latitude, longitude },
      {
        latitude: latitude + lineLength * Math.cos(angleRad),
        longitude: longitude + lineLength * Math.sin(angleRad)
      }
    ];
  };

  const getArrowHead = () => {
    if (!windDirection || !windSpeed || !hasDanger) return [];
    const arrowLength = 0.0065;
    const headLength = 0.0005;
    const headWidth = 0.0005;

    const tipLat = latitude + arrowLength * Math.cos(angleRad);
    const tipLng = longitude + arrowLength * Math.sin(angleRad);

    const leftLat = tipLat - headLength * Math.cos(angleRad) + headWidth * Math.cos(angleRad - Math.PI / 2);
    const leftLng = tipLng - headLength * Math.sin(angleRad) + headWidth * Math.sin(angleRad - Math.PI / 2);

    const rightLat = tipLat - headLength * Math.cos(angleRad) + headWidth * Math.cos(angleRad + Math.PI / 2);
    const rightLng = tipLng - headLength * Math.sin(angleRad) + headWidth * Math.sin(angleRad + Math.PI / 2);

    return [
      { latitude: tipLat, longitude: tipLng },
      { latitude: leftLat, longitude: leftLng },
      { latitude: rightLat, longitude: rightLng }
    ];
  };

  const isPointInPolygon = (point, vs) => {
    if (!vs || vs.length < 3) return false;
    const x = point.latitude;
    const y = point.longitude;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i].latitude, yi = vs[i].longitude;
      const xj = vs[j].latitude, yj = vs[j].longitude;
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi + 0.0000001) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  useEffect(() => {
    let repeatInterval = null;
    const checkZone = () => {
      if (!userLocation) return;
      const distance = Math.sqrt(
        Math.pow(userLocation.latitude - latitude, 2) +
        Math.pow(userLocation.longitude - longitude, 2)
      );
      let newStatus = "";
      if (distance < 0.002 && hasDanger) {
        newStatus = "🚨 Du er i fareområdet (rød zone)!";
      } else if (isPointInPolygon(userLocation, polygonCoords) && hasDanger) {
        newStatus = "⚠️ Fare for farlige stoffer pga. vindretningen (gul zone)!";
      } else {
        newStatus = "✅ Du er uden for fareområder.";
      }
      setZoneStatus(newStatus);
      if (newStatus !== lastZone) {
        if (newStatus.includes("🚨") || newStatus.includes("⚠️")) {
          playAlert();
        }
        setLastZone(newStatus);
      }
    };

    checkZone();

    repeatInterval = setInterval(() => {
      if ((zoneStatus.includes("🚨") || zoneStatus.includes("⚠️")) && hasDanger) {
        playAlert();
      }
    }, 5000);

    return () => {
      if (repeatInterval) clearInterval(repeatInterval);
    };
  }, [userLocation, latitude, longitude, polygonCoords, zoneStatus, hasDanger]);

  const playAlert = () => {
    if (sound) {
      sound.replayAsync();
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  // Skråfoto button open function
  const openSkraafoto = () => {
    const year = 2023;
    const direction = 'nord';
    const skråfotoUrl = `https://skraafoto.dataforsyningen.dk/?center=${longitude},${latitude}&zoom=20&collection=${year}&view=${direction}`;
    console.log("Opening Skråfoto URL:", skråfotoUrl); 
    Linking.openURL(skråfotoUrl).catch(() => {
      Alert.alert("Fejl", "Kunne ikke åbne Skråfoto link.");
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          title={adresse}
          description={`Brandsted: ${brandsted}`}
        />
        <Circle
          center={{ latitude, longitude }}
          radius={150}
          strokeColor="red"
          fillColor="rgba(255,0,0,0.3)"
        />
        {hasDanger && windDirection && windSpeed && (
          <>
            <Polygon
              coordinates={polygonCoords}
              strokeColor="yellow"
              fillColor="rgba(255, 255, 0, 0.4)"
            />
            <Polyline
              coordinates={getWindArrow()}
              strokeColor="orange"
              strokeWidth={5}
            />
            <Polygon
              coordinates={getArrowHead()}
              strokeColor="orange"
              fillColor="orange"
            />
          </>
        )}

        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Brandbil"
            description="Din placering (simuleret)"
            pinColor="blue"
          />
        )}
      </MapView>

      {/* Back button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButtonTop}>
        <Ionicons name="arrow-back" size={30} color="black" />
      </TouchableOpacity>

      <ScrollView style={styles.infoBox}>
        <Text style={styles.adresse}>{adresse}</Text>

        <Text style={[
          styles.statusText,
          zoneStatus.includes('🚨') ? styles.red :
            zoneStatus.includes('⚠️') ? styles.yellow :
              styles.green
        ]}>
          {zoneStatus}
        </Text>

        <Text style={styles.sectionTitle}>🔥 Brandsted</Text>
        <Text style={styles.sectionText}>{brandsted}</Text>

        <Text style={styles.sectionTitle}>⚠️ Farer</Text>
        <Text style={styles.sectionText}>{farer}</Text>

        <Text style={styles.sectionTitle}>🛑 Sikkerhedsafstand</Text>
        <Text style={styles.sectionText}>150 meter</Text>

        <Text style={styles.sectionTitle}>✅ Anbefalinger</Text>
        <Text style={styles.sectionText}>{ekstraInfo}</Text>

        {windDirection && windSpeed && (
          <>
            <Text style={styles.sectionTitle}>🌬 Vindretning</Text>
            <Text style={styles.sectionText}>{windDirection} grader</Text>
            <Text style={styles.sectionTitle}>💨 Vindhastighed</Text>
            <Text style={styles.sectionText}>{windSpeed} m/s</Text>
          </>
        )}

        <View style={{ marginTop: 10 }}>
          <Button title="Åbn Skråfoto kort" onPress={openSkraafoto} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 2 },
  infoBox: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ccc',
  },
  adresse: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  red: { color: 'red' },
  yellow: { color: 'orange' },
  green: { color: 'green' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  sectionText: {
    fontSize: 14,
    marginBottom: 5,
  },
  backButtonTop: {
    position: 'absolute',
    top: 40,
    left: 10,
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 20,
    zIndex: 10
  }
});
