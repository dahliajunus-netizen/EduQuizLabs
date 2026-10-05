import { NextRequest, NextResponse } from 'next/server';
import { authenticatedUser } from '@/lib/server/supabase';
import { supabaseDb } from '@/lib/server/supabase';

const q = (value:string) => encodeURIComponent(value);

export async function POST(request:NextRequest){
  const student=await authenticatedUser(request);
  const body=await request.json().catch(()=>null);
  const quizId=String(body?.quiz_id||'').trim();
  const questionId=String(body?.question_id||'').trim();
  const playerId=String(body?.player_id||'').trim();
  const answer=String(body?.answer||'').trim().toUpperCase();
  if(!quizId||!questionId||!playerId||!['A','B','C','D'].includes(answer))
    return NextResponse.json({error:'Quiz, question, player and answer are required.'},{status:400});

  try{
    const players=await supabaseDb(`live_quiz_players?id=eq.${q(playerId)}&quiz_id=eq.${q(quizId)}&select=id,student_id,nickname,score,correct_answers,total_response_time_ms&limit=1`);
    const player=Array.isArray(players)?players[0]:null;
    if(!player) return NextResponse.json({error:'Player session not found.'},{status:404});
    if(student?.id && player.student_id && String(player.student_id)!==String(student.id))
      return NextResponse.json({error:'Player session does not belong to this account.'},{status:403});

    const quizzes=await supabaseDb(`live_quizzes?id=eq.${q(quizId)}&select=id,status,current_question,question_started_at&limit=1`);
    const quiz=Array.isArray(quizzes)?quizzes[0]:null;
    if(!quiz) return NextResponse.json({error:'Live quiz not found.'},{status:404});
    if(String(quiz.status)!=='answering') return NextResponse.json({error:'Answers are closed.'},{status:409});

    const questions=await supabaseDb(`live_quiz_questions?id=eq.${q(questionId)}&quiz_id=eq.${q(quizId)}&select=id,question_order,correct_answer,time_limit_seconds&limit=1`);
    const question=Array.isArray(questions)?questions[0]:null;
    if(!question||Number(question.question_order)!==Number(quiz.current_question))
      return NextResponse.json({error:'This question is no longer active.'},{status:409});

    const existing=await supabaseDb(`live_quiz_answers?quiz_id=eq.${q(quizId)}&question_id=eq.${q(questionId)}&player_id=eq.${q(playerId)}&select=answer,correct,response_time_ms,points_earned&limit=1`);
    if(Array.isArray(existing)&&existing[0]) return NextResponse.json(existing[0]);

    const started=quiz.question_started_at?new Date(String(quiz.question_started_at)).getTime():Date.now();
    const limit=Math.max(1,Number(question.time_limit_seconds)||30)*1000;
    const elapsed=Math.min(limit,Math.max(0,Date.now()-started));
    const correct=answer===String(question.correct_answer||'').trim().toUpperCase();
    const points=correct?1:0;

    const inserted=await supabaseDb('live_quiz_answers',{
      method:'POST',
      headers:{'Content-Type':'application/json',Prefer:'return=representation'},
      body:JSON.stringify({quiz_id:quizId,question_id:questionId,player_id:playerId,answer,correct,response_time_ms:elapsed,points_earned:points}),
    });
    const nextCorrect=Number(player.correct_answers||0)+points;
    const nextTime=Number(player.total_response_time_ms||0)+elapsed;
    const nextScore=Number(player.score||0)+points;
    const updated=await supabaseDb(`live_quiz_players?id=eq.${q(playerId)}&quiz_id=eq.${q(quizId)}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json',Prefer:'return=representation'},
      body:JSON.stringify({correct_answers:nextCorrect,total_response_time_ms:nextTime,score:nextScore}),
    });
    return NextResponse.json({answer:inserted?.[0]||inserted,player:updated?.[0]||{...player,correct_answers:nextCorrect,total_response_time_ms:nextTime,score:nextScore}});
  }catch(error){
    console.error('[Student Live Quiz Answer API] POST failed:',error);
    return NextResponse.json({error:error instanceof Error?error.message:'Unable to submit answer.'},{status:500});
  }
}
