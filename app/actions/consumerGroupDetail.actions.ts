import { Admin, GroupOverview } from 'kafkajs';
import * as _ from 'lodash';
import { Dispatch, GetState } from '../reducers/types';
import { getConsumerGroupDescriptions } from './kafkaNode.actions';

export const CONSUMER_GROUP_DETAIL = 'CONSUMER_GROUP_DETAIL';

export function consumerGroupDetail(groupDetail: GroupOverview) {
  return {
    type: CONSUMER_GROUP_DETAIL,
    groupDetail
  };
}

export function getConsumerGroupDetail(groupId: string, topic: string) {
  return (dispatch: Dispatch, getState: GetState) => {
    const admin = getState().kafka.client.admin();

    return getConsumerGroupOffset(admin, topic, groupId).then(
      partitionOffsets => {
        getConsumerGroupDescriptions(
          getState().kafka.url,
          [groupId],
          '',
          groupDescript => {
            groupDescript = groupDescript[0];
            groupDescript.members.forEach(member => {
              const assginedPartitions = member.memberAssignment.partitions;
              Object.keys(assginedPartitions)
                .forEach(subscriptionTopic => {
                  assginedPartitions[subscriptionTopic] = assginedPartitions[subscriptionTopic].map(
                  partId => partitionOffsets[partId]
                );
              });
            });
            dispatch(consumerGroupDetail(groupDescript));
          }
        );
      }
    );
  };
}

const getConsumerGroupOffset = (admin: Admin, topic: string, groupId: string) =>
  Promise.all([
    admin.fetchOffsets({ groupId, topic }).then(res => {
      const partitions = {};
      res.forEach(offset => (partitions[offset.partition] = offset));
      return partitions;
    }),
    getTopicOffset(admin, topic)
  ]).then(result => {
    const merged = Object.values(result[0]).map(part => {
      part.topicOffset = result[1][part.partition];
      return part;
    });
    return _.keyBy(merged, 'partition');
  });

const getTopicOffset = (admin: Admin, topic: string) =>
  admin.fetchTopicOffsets(topic).then(res => {
    const partitions = {};
    res.forEach(part => (partitions[part.partition] = part));
    return partitions;
  });
