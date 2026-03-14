import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Proyecto Prysmian</Text>
        <Text style={styles.subtitle}>Panel de Control Web & Móvil</Text>

        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>✅ Firebase: Configurado</Text>
          <Text style={styles.statusText}>🚀 SDK: 54 (Estable)</Text>
          <Text style={styles.statusText}>🌐 Entorno: Vercel Ready</Text>
        </View>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => Linking.openURL('https://vercel.com/dashboard')%7D
        >
          <Text style={styles.buttonText}>Ir a Configuración Vercel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  statusContainer: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    marginVertical: 5,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});