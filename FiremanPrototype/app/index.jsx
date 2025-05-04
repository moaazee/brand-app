import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetch('http://192.168.0.34:5000/alerts') // Update to your local IP
      .then(res => res.json())
      .then(data => setAlerts(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Indkommende Alarmer</Text>
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.alertBox}>
            <Text style={styles.adresse}>{item.adresse}</Text>
            <Text>Brandsted: {item.brandsted}</Text>
            <Text>Farer: {item.farer}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push({
                pathname: '/detail/brandinfo',
                params: {
                  adresse: item.adresse,
                  brandsted: item.brandsted,
                  farer: item.farer,
                  ekstraInfo: item.ekstraInfo,
                  lat: item.lat,
                  lng: item.lng,
                }
              })}
            >
              <Text style={styles.buttonText}>Vis på kortet</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  alertBox: {
    padding: 15,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    marginBottom: 10,
  },
  adresse: { fontSize: 16, fontWeight: 'bold' },
  button: {
    marginTop: 10,
    backgroundColor: '#d32f2f',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: { color: '#fff', textAlign: 'center' },
});
