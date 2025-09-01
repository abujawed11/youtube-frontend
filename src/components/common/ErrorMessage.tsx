import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  onRetry, 
  showRetry = true 
}) => {
  return (
    <View className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
      <View className="flex-row items-center mb-2">
        <Ionicons name="alert-circle" size={20} color="#DC2626" />
        <Text className="text-red-800 font-semibold ml-2">Error</Text>
      </View>
      <Text className="text-red-700 mb-3">{message}</Text>
      {showRetry && onRetry && (
        <TouchableOpacity 
          onPress={onRetry}
          className="bg-red-600 rounded px-4 py-2 self-start"
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ErrorMessage;