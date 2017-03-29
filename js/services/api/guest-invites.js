import firebase from 'firebase';
import moment from 'moment';
import api from './base';
import potlucks from './pot-lucks';
import userDetails from './user-details';
import { decodeObjectKeys } from '../../helpers';

const createPotluckGuest = (potluckId, uIds) => {
  const potluckUserGuest = {
    inviteIssued: true,
    inviteIssueDate: moment(Date.now()).format('YYYY-MM-DD'),
    inviteAccepted: false,
    inviteAcceptedDate: null,
    inviteCancelled: null,
    inviteCancelledDate: null,
  };

  uIds.forEach((uId) => {
    const updates = {
      [`/potLuckGuests/${potluckId}/${uId}`]: potluckUserGuest,
    };

    return api.change(updates);
  });
};

const createUserPotluck = (potluckId, potluckInfo, uIds) => {
  const userPotluck = {
    isHost: false,
    isNew: true,
    eventDate: potluckInfo.eventDate,
    title: potluckInfo.title,
    description: potluckInfo.description,
  };

  uIds.forEach((uId) => {
    const updates = {
      [`/userPotLucks/${uId}/${potluckId}`]: userPotluck,
    };

    return api.change(updates);
  });
};

const getDetailsForEmail = (email) => {
  return firebase
    .database()
    .ref()
    .child('userDetails')
    .orderByChild('emailAddress')
    .equalTo(email)
    .once('value');
};

const deleteExistingUserGuestInvite = (potluckId, email) => {
  firebase.database()
    .ref()
    .child(`potLuckInvites/${potluckId}/guests/${btoa(email)}`)
    .remove();
};

const processSignInEmailInvites = (potluckId, guestEmails) => {
  const decodedGuestEmails = decodeObjectKeys(guestEmails.guests);

  // get uIds for existing users from their emails
  const promises = Object.values(decodedGuestEmails)
    .map((email) => {
      return getDetailsForEmail(email)
        .then((result) => {
          if (result.val()) {
            // delete existing user emails from potluck guest email list
            deleteExistingUserGuestInvite(potluckId, email);

            return Object.keys(result.val())[0];
          }
        });
    });

  return Promise.all(promises).then((uIds) => { 
    return uIds.filter(uId => !!uId);
  });
};

const getPotluckInvites = () => {
  return firebase.database()
    .ref()
    .child('/potLuckInvites')
    .once('value');
};

const getPotluckInviteEmail = (potluckId, encodedEmail) => {
  const result = firebase.database()
    .ref(`/potLuckInvites/${potluckId}/guests/${encodedEmail}`)
    .once('value');

  if (result) return potluckId;
};

const processSignUpEmailInvites = (userId, email) => {
  const encodedEmail = btoa(email);

  return getPotluckInvites()
    .then((potluckIdResult) => {
      return Object.keys(potluckIdResult.val());
    })
    .then((result) => {
      const promises = result
        .map((potluckId) => {
          // search potluckIds for contained email and return potluckId if true
          return getPotluckInviteEmail(potluckId, encodedEmail);
        });

      return Promise.all(promises);
    })
    .then((potluckIds) => {
      potluckIds.forEach((potluckId) => {
        // if any invites create potluck guest records with potluckid
        createPotluckGuest(potluckId, [userId]);

        // get potluck info details
        potlucks.getPotluck(potluckId)
          .then((potluckInfo) => {
            // create user invite records
            createUserPotluck(potluckId, potluckInfo, [userId]);
          });

        // delete email from potluck guest email list
        deleteExistingUserGuestInvite(potluckId, email);
      });
    })
    .then(() => {
      return 'Sign-up invites matched.';
    });
};

const checkForUserInvites = (potluckId, userId) => {
  return firebase.database()
    .ref()
    .child(`/potLuckGuests/${potluckId}/${userId}`)
    .once('value')
    .then((result) => {
      return result.val();
    });
};

const getGuestInviteUserDetailsAccept = (potluckId, userId) => {
  return Promise.resolve(checkForUserInvites(potluckId, userId))
    .then((invite) => {
      if (invite.inviteAccepted) {
        return userDetails.get(userId);
      }
    });
};

const getGuestInviteUserDetailsReject = (potluckId, userId) => {
  return Promise.resolve(checkForUserInvites(potluckId, userId))
    .then((invite) => {
      if (invite.inviteDeclined) {
        return userDetails.get(userId);
      }
    });
};

const getGuestInviteUserDetailsNoResponse = (potluckId, userId) => {
  return Promise.resolve(checkForUserInvites(potluckId, userId))
    .then((invite) => {
      if (!invite.inviteAccepted && !invite.inviteDeclined) {
        return userDetails.get(userId);
      }
    });
};

const processtPotluckUserInviteResponses = (potluckId, inviteType) => {
  return api.get(`/potLuckGuests/${potluckId}`)
    .then((userIds) => {
      return Object.keys(userIds);
    })
    .then((result) => {
      const promises = result
        .map((userId) => {
          return inviteType(potluckId, userId);
        });

      return Promise.all(promises);
    })
    .then((users) => {
      return users.filter(user => !!user);
    })
    .catch(() => {
      return [];
    });
};

const getPotluckGuestInviteEmails = (potluckId) => {
  return firebase.database()
    .ref()
    .child(`potLuckInvites/${potluckId}/guests`)
    .once('value')
    .then((result) => {
      return result.val();
    });
};

const processPotluckEmailInviteNoResponses = (potluckId) => {
  return Promise.resolve(getPotluckGuestInviteEmails(potluckId))
    .then((result) => {
      const emails = Object.keys(result).map((email) => {
        return atob(email);
      });

      return emails;
    })
    .catch(() => {
      return [];
    });
};

const createGuestResponses = (inviteResponses) => {
  const guestResponses = [];

  Object.keys(inviteResponses).map((key) => {
    if (key === 'userAccept' && inviteResponses[key].length > 0) {
      inviteResponses[key].forEach((item) => {
        guestResponses.push([`${item.firstName} ${item.lastName}`, '+']);
      });
    }
    if (key === 'userReject' && inviteResponses[key].length > 0) {
      inviteResponses[key].forEach((item) => {
        guestResponses.push([`${item.firstName} ${item.lastName}`, '-']);
      });
    }
    if (key === 'userNoResponse' && inviteResponses[key].length > 0) {
      inviteResponses[key].forEach((item) => {
        guestResponses.push([`${item.firstName} ${item.lastName}`, '?']);
      });
    }
    if (key === 'emailNoResponse' && inviteResponses[key].length > 0) {
      inviteResponses[key].forEach((item) => {
        guestResponses.push([item, '?']);
      });
    }
  });

  return guestResponses;
};

const getPotluckInviteResponses = (potluckId) => {
  const promises = [
    processtPotluckUserInviteResponses(potluckId, getGuestInviteUserDetailsAccept) || [],
    processtPotluckUserInviteResponses(potluckId, getGuestInviteUserDetailsReject) || [],
    processtPotluckUserInviteResponses(potluckId, getGuestInviteUserDetailsNoResponse) || [],
    processPotluckEmailInviteNoResponses(potluckId) || [],
  ];

  return Promise.all(promises)
    .then((result) => {
      const inviteResponses = {
        userAccept: result[0],
        userReject: result[1],
        userNoResponse: result[2],
        emailNoResponse: result[3],
      };

      return inviteResponses;
    })
    .then((result) => {
      return createGuestResponses(result);
    });
};

export default {
  createPotluckGuest,
  createUserPotluck,
  deleteExistingUserGuestInvite,
  processSignInEmailInvites,
  processSignUpEmailInvites,
  getPotluckInviteResponses
};
