import { describe, expect, it } from 'vitest';
import { classifyTicket, detectPlatform, parsePlatform } from '../src/itil.js';
import { decideAgentAction, type AgentContext } from '../src/agentPolicy.js';
import { composeAssistantReply, composeAssistantReplyLive } from '../src/assistantReply.js';
import { strings } from '../src/i18n.js';

// The specification for what the desk does with an Android report, written
// as the failure it exists to stop.
//
// Before this, an Android tester's bug report matched `getting-the-app` --
// a reviewed, sourced, correct-about-the-App-Store article whose first
// sentence is that there is no Android version. So the desk answered the
// people testing the Android build by telling them, with a citation, that
// what they were holding did not exist. The tests below are mostly about
// that one sentence never reaching a tester again.

describe('detectPlatform', () => {
  it('reads Android reports as Android', () => {
    for (const text of [
      'The app crashes on launch on my Pixel 9',
      'Android build force closes when I open the Discover tab',
      'installed the apk from the internal testing track and it will not open',
      'Hamdam is not showing in the Play Store for me',
      'Galaxy S24, the daily verse is blank',
      'notifications never arrive on my Samsung',
      'گزارش خطا در نسخه‌ی اندروید برنامه',
      'روی گوشی شیائومی باز نمی‌شود',
    ]) {
      expect(detectPlatform(text), text).toBe('android');
    }
  });

  it('leaves everything else unspecified', () => {
    for (const text of [
      'my daily verse is blank',
      'How do I change the daily reminder?',
      'I bought Hamdam Plus on my iPhone and it has not appeared',
      'How does Windows 11 password reset work?',
      'شعر امروز بارگذاری نمی‌شود',
    ]) {
      expect(detectPlatform(text), text).toBe('unspecified');
    }
  });

  // The one that is easy to get wrong: an Android report is still a report
  // about Hamdam, so it must keep the topic floor. Suppressing the automatic
  // reply is not the same as deprioritising the ticket, and if this ever
  // starts returning P4 the change has quietly done the opposite of what it
  // was for.
  it('keeps the Hamdam floor on an Android report', () => {
    const r = classifyTicket('low', 'low', 'the daily verse is blank on my Pixel');
    expect(r.platform).toBe('android');
    expect(r.topic).toBe('hamdam');
    expect(r.priority).toBe('P3');
  });

  it('does not lower a severe Android report', () => {
    const r = classifyTicket('high', 'high', 'Android build crashes for everyone, all users affected');
    expect(r.platform).toBe('android');
    expect(r.priority).toBe('P1');
  });
});

describe('parsePlatform', () => {
  it('accepts the two real values and nothing else', () => {
    expect(parsePlatform('android')).toBe('android');
    expect(parsePlatform('unspecified')).toBe('unspecified');
    for (const bad of ['ios', 'ANDROID', 'constructor', '', null, undefined]) {
      expect(parsePlatform(bad as string | null | undefined)).toBeUndefined();
    }
  });
});

const base: AgentContext = {
  priority: 'P4',
  conversationText: '',
  assistantTurns: 0,
  askedQuestions: [],
};

describe('the Android gate in decideAgentAction', () => {
  // The live failure, as a test, and the assertion on the *ungated* call is
  // the load-bearing half: it pins that this text really does match an
  // article confidently, so the gate below is stopping something rather than
  // agreeing with a decision already made elsewhere. Delete the gate and
  // this Android tester is told to flick the app card away and check the App
  // Store for an update -- two iOS gestures, on a phone that has neither.
  it('never sends an article to an Android requester, however good the match', () => {
    const conversationText = 'blank verse, nothing appears, stuck loading on my Pixel since the last build';
    const withoutGate = decideAgentAction({ ...base, conversationText });
    expect(withoutGate.action).toBe('send_solution');
    if (withoutGate.action === 'send_solution') expect(withoutGate.articleId).toBe('verse-not-loading');

    const withGate = decideAgentAction({ ...base, platform: 'android', conversationText });
    expect(withGate.action).toBe('escalate');
    expect(withGate.reason).toMatch(/Android/);
  });

  it('does not ask a clarifying question from the iOS articles either', () => {
    const r = decideAgentAction({ ...base, platform: 'android', conversationText: 'restore purchase on my Pixel' });
    expect(r.action).toBe('escalate');
  });

  // Deliberate, and worth stating because it looks like an accident: an
  // iPhone user asking "is there an Android version yet?" also trips the
  // detector and also reaches a person. That is the outcome we want. The
  // knowledge base still says there is no Android version, which is true of
  // the public store and is the only answer the desk is allowed to give
  // while the build is in closed testing -- and the desk should not be the
  // thing that announces an unreleased build to whoever asks. A person can
  // decide what to tell them; an automatic reply cannot.
  it('sends the "is there an Android version" question to a person too', () => {
    const r = decideAgentAction({
      ...base,
      platform: detectPlatform('Is there an Android version of Hamdam coming?'),
      conversationText: 'Is there an Android version of Hamdam coming?',
    });
    expect(r.action).toBe('escalate');
  });

  it('leaves an unspecified ticket exactly as it was', () => {
    const conversationText = 'paid but Hamdam Plus is not working, subscription missing';
    expect(decideAgentAction({ ...base, conversationText }).action).toBe('send_solution');
    expect(decideAgentAction({ ...base, platform: 'unspecified', conversationText }).action).toBe('send_solution');
  });
});

describe('what the Android requester actually reads', () => {
  it('gets the beta wording, in their own language, and no App Store link', () => {
    for (const locale of ['en', 'fa'] as const) {
      const reply = composeAssistantReply({
        ...base,
        platform: 'android',
        locale,
        conversationText: 'Where do I download the Android version? It is not in the Play Store',
        rejectedArticles: [],
      });
      expect(reply.action).toBe('escalate');
      expect(reply.escalated).toBe(true);
      expect(reply.body).toBe(strings(locale).replyAndroidBeta);
      expect(reply.body).not.toMatch(/apps\.apple\.com/);
      expect(reply.body.toLowerCase()).not.toMatch(/app store/);
    }
  });

  // Said once, not on every turn. The desk has been here before with the
  // handover paragraph that repeated itself until it read as broken.
  it('does not repeat itself once the ticket is already with a person', () => {
    const reply = composeAssistantReply({
      ...base,
      platform: 'android',
      alreadyEscalated: true,
      conversationText: 'any update on the Pixel crash?',
      rejectedArticles: [],
    });
    expect(reply.body).toBe(strings('en').replyAlreadyEscalated);
  });
});

// The other route to the same wrong answer, and the one that produced the
// literal "there is no Android version" sentence: `getting-the-app` is an app
// *reference*, not a matchable article, so it never reaches the deterministic
// path above -- it reaches the model, as source material, correctly labelled
// as reviewed fact. A model following its instructions faithfully will then
// tell a tester the build in their hand does not exist. So the model is not
// asked.
describe('the model is never consulted about an Android ticket', () => {
  it('does not call generate, and answers from the deterministic path', async () => {
    let called = 0;
    const reply = await composeAssistantReplyLive(
      {
        ...base,
        platform: 'android',
        conversationText: 'where do I get the Android build, it is not in the Play Store',
        rejectedArticles: [],
      },
      {
        ai: {} as Ai,
        ticketSubject: 'Android build',
        turns: [{ author: 'requester', body: 'where do I get the Android build?' }],
        generate: async () => {
          called += 1;
          throw new Error('the model must not be asked about an Android ticket');
        },
      },
    );
    expect(called).toBe(0);
    expect(reply.body).toBe(strings('en').replyAndroidBeta);
    expect(reply.escalated).toBe(true);
  });

  it('still consults the model on an unspecified ticket', async () => {
    let called = 0;
    await composeAssistantReplyLive(
      { ...base, conversationText: 'my daily verse is blank', rejectedArticles: [] },
      {
        ai: {} as Ai,
        ticketSubject: 'Blank verse',
        turns: [{ author: 'requester', body: 'my daily verse is blank' }],
        generate: async () => {
          called += 1;
          throw new Error('stop here; the call happening is the whole assertion');
        },
      },
    );
    expect(called).toBe(1);
  });
});
