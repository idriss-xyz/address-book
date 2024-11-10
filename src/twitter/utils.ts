import { fetchSafe } from '../utils/fetchSafe';

import {
  IDRISS_GET_TWITTER_ID_URL,
  IDRISS_GET_TWITTER_NAME_URL,
} from './constants';

export const reverseTwitterID = async (id: string): Promise<string> => {
  const response = await fetchSafe(
    IDRISS_GET_TWITTER_NAME_URL + encodeURIComponent(id),
  );
  if (response.status != 200)
    throw new Error(
      'IDriss api responded with code ' +
        response.status +
        ' ' +
        response.statusText +
        '\r\n' +
        (await response.text()),
    );
  const json = await response.json();
  return json[id];
};

export const getTwitterID = async (
  inputCombination: string,
): Promise<string> => {
  console.log(IDRISS_GET_TWITTER_ID_URL + encodeURIComponent(inputCombination));

  const response = await fetchSafe(
    IDRISS_GET_TWITTER_ID_URL + encodeURIComponent(inputCombination),
  );
  if (response.status != 200)
    throw new Error(
      'IDriss api responded with code ' +
        response.status +
        ' ' +
        response.statusText +
        '\r\n' +
        (await response.text()),
    );
  const json = await response.json();
  return json.twitterID;
};
