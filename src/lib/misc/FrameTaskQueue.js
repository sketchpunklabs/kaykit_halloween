import Heap from './Heap.js';

// #region TYPES
// export type TFrameTaskFunc = (
//     dt          : number,
//     et          : number,
//     task        : TFrameTask,
// ) => boolean;
  
// export type TFrameTask = {
//     frameDelay  : number,
//     priority    : number,
//     elapsedTime : number,
//     fn          : TFrameTaskFunc,
// };
// #endregion
  
export default class FrameTaskQueue{
    // #region MAIN
    queue = new Heap( (a, b) => a.priority > b.priority );
    // #endregion
  
    // #region METHODS
    /** Create a task from a function references */
    addTask( fn, frameDelay = 0, priority = 0 ){
      this.enqueue( { elapsedTime: 0, frameDelay, priority, fn } );
      return this;
    }
  
    /** Push a task onto the queue */
    enqueue( task ){
      this.queue.add( task );
      return this;
    }
    // #endregion
  
    update( dt, et ){
      // Early exist on empty queue
      if( this.queue.length === 0 ) return;
  
      // Execute all the available tasks & keep track of whats completed
      const completed = [];
  
      for (const task of this.queue.items) {
        // Don't start task until enough frames have ellapsed
        if( task.frameDelay > 0 ){ task.frameDelay--; continue; }
  
        // Execute with error capturing
        try{
          if( task.fn( dt, et, task ) )     completed.push(task);
          else                              task.elapsedTime += dt; // Update task time for next iteration
        }catch(err){
          const msg = err instanceof Error ? err.message : String( err );
          console.log( 'Error running a frame task: $s', msg );
        }
      }
  
      // Remove any tasks that are completed
      for (const t of completed) {
        this.queue.removeItem(t);
      }
    }
  }