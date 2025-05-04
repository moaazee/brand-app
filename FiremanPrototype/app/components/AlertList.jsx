import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AlertList({ alert }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{alert.address}</Text>
      <Text>{alert.fireLocation} — {alert.hazards}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
