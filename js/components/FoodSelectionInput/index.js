import React, { PropTypes } from 'react';
import { View, TextInput, Text } from 'react-native';

import styles from './styles';


const FoodSelectionInput = ({ count, color, username, lastItem }) => (
    <View style={[styles.textInputContainer, lastItem && { marginBottom: 0 }]}>
      <View style={styles.inputTextContainer}>
        <TextInput style={[styles.inputText, { backgroundColor: color }]} />
      </View>
      <View style={styles.usernameTextContainer}>
        <Text style={[styles.usernameText, { color }]}>{username}</Text>
      </View>
    </View>
);

FoodSelectionInput.propTypes = {
  color: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  lastItem: PropTypes.bool.isRequired
};

export default FoodSelectionInput;
