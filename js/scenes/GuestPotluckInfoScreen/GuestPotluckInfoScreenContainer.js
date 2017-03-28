import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';

import GuestPotluckInfoScreen from './GuestPotluckInfoScreen';
import { fetchCurrentPotluck } from '../../redux/modules/currentPotluckActions';

class GuestPotluckInfoScreenContainer extends Component {

  componentWillMount() {
    this.props.dispatch(fetchCurrentPotluck(this.props.navigation.state.params.potluckId));
  }

  render() {
    return (
      <GuestPotluckInfoScreen currentPotluck={this.props.currentPotluck} />
    );
  }
}

const mapStateToProps = state => ({
  userId: state.userSignIn.uId,
  currentPotluck: state.currentPotluck,
  isLoading: state.isLoading,
});

GuestPotluckInfoScreenContainer.propTypes = {
  navigation: PropTypes.func.isRequired,
  currentPotluck: PropTypes.object.isRequired
};


export default connect(mapStateToProps)(GuestPotluckInfoScreenContainer);
