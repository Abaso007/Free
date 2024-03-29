import { MessageInterface, ModelOptions } from '@type/chat';

import { Tiktoken } from '@dqbd/tiktoken/lite';
const cl100k_base = await import('@dqbd/tiktoken/encoders/cl100k_base.json');

const encoder = new Tiktoken(
  cl100k_base.bpe_ranks,
  {
    ...cl100k_base.special_tokens,
    '<|im_start|>': 100264,
    '<|im_end|>': 100265,
    '<|im_sep|>': 100266,
  },
  cl100k_base.pat_str
);

// https://github.com/dqbd/tiktoken/issues/23#issuecomment-1483317174
export const getChatGPTEncoding = (
  messages: MessageInterface[],
  model: ModelOptions
) => {
  const isGpt3 = model === 'gpt-3.5-turbo';

  const msgSep = isGpt3 ? '\n' : '';
  const roleSep = isGpt3 ? '\n' : '<|im_sep|>';

  const serialized = [
    messages
      .map(({ role, content }) => {
        return `<|im_start|>${role}${roleSep}${content}<|im_end|>`;
      })
      .join(msgSep),
    `<|im_start|>assistant${roleSep}`,
  ].join(msgSep);

  return encoder.encode(serialized, 'all');
};

const countTokens = (messages: MessageInterface[], model: ModelOptions) => {
  if (messages.length === 0) return 0;
  return getChatGPTEncoding(messages, model).length;
};

export const limitMessageTokens = (
  messages: MessageInterface[],
  limit: number = 4096,
  model: ModelOptions
): MessageInterface[] => {
  const limitedMessages: MessageInterface[] = [];
  let tokenCount = 0;

  if (messages[0]?.role === 'system') {
    const count = countTokens([messages[0]], model);
    tokenCount += count;
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const count = countTokens([messages[i]], model);
    if (count + tokenCount > limit) break;
    tokenCount += count;
    limitedMessages.unshift({ ...messages[i] });
  }

  if (messages[0]?.role === 'system' && limitedMessages[0]?.role !== 'system') {
    limitedMessages.unshift({ ...messages[0] });
  }

  if (limitedMessages.length > 4 && limitedMessages[0].role === 'system'){
    const firstElement = limitedMessages.shift(); // 取出第一个元素并移除
    if (firstElement !== undefined) { // 确保 firstElement 不为 undefined
      limitedMessages.splice(-3, 0, firstElement); // 将第一个元素插入到倒数第四个位置
    }
  }

  return limitedMessages;
};

export default countTokens;
