import useThreeWebGL2, { THREE }    from './lib/useThreeWebGL2.js';
import usePostEffects               from './lib/usePostEffects.js';
import useDarkScene                 from './lib/useDarkScene.js';
import AssetLibrary                 from './lib/AssetLibrary.js';
import GridMap                      from './lib/GridMap.js';
import FrameTaskQueue               from './lib/misc/FrameTaskQueue.js';

import { GLTFLoader }               from 'tp/GLTFLoader.js';

export default class App{
    // #region MAIN
    constructor( props={} ){
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        props = Object.assign( {
            postEffects : false,
        }, props );

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        if( !props.postEffects ){
            this.three = useDarkScene( useThreeWebGL2( { colorMode:true }) );
            
        }else{
            this.three = useDarkScene( usePostEffects( useThreeWebGL2( { colorMode:true }) ) );
            addEffects( this.three );
        }

        this.renderLoop = this.three.createRenderLoop( this.onPreRender );
        this.assets     = new AssetLibrary();
        this.grid       = new GridMap( [10,10], 4, this.three.scene ).setOffset( -5*4, -5*4 );
        this.taskQueue  = new FrameTaskQueue();

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        this.three.sphericalLook( 40, 20, 25 );

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        this.startLoadingAssets();
        this.startLoadingCharacter();
    }

    onPreRender = ( dt, et )=>{
        this.taskQueue.update( dt, et );
    };
    // #endregion

    // #region LOADING
    async startLoadingAssets(){
        await this.assets.loadCollection( 'src/assets.json' );
      
        for( const k in this.assets.items ){
            const o = this.assets.items[k];
            this.grid.addTile( k, o.geo, o.mat  );
        }

        await this.grid.loadLevel( 'src/grid.json' );
    }

    async startLoadingCharacter(){
        const loader = new GLTFLoader();
        loader.load( 'assets/skeletons/character_skeleton_minion.gltf',
            gltf=>{
                const char = gltf.scene.children[0];
                const posA = this.grid.coordToPos( [4,4], [0.5,0.2] );
                const posB = this.grid.coordToPos( [4,6], [0.5,0.2] );

                posA[1] = 0.1;
                posB[1] = 0.1;
                char.position.fromArray( posA );
                this.three.scene.add( char );

                this.taskQueue.addTask( createWalkHopTask( char, posA, posB, 9, 0.1, 15 ) );
            },
            null,
            err =>console.log( "ERROR LOADING CHARACTER" ),
        );
    }
    // #endregion
}

// #region ANIMATION
function createWalkHopTask( char, posA, posB, span, hop, hspeed ){
    return ( dt, et, task )=>{
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Compute animation time
        let t = et / span;
        t    -= Math.floor( t );
        t     = Math.sin( t * Math.PI * 2 );
        t     = t * 0.5 + 0.5;

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Walking
        const ti = 1 - t;
        const z  = posA[2] * ti + posB[2] * t;

        char.rotation.y = ( char.position.z > z  )? Math.PI : 0;
        char.position.set(
            posA[0] * ti + posB[0] * t,
            posA[1] * ti + posB[1] * t,
            z,
        );

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Hopping
        t = Math.sin( et * hspeed ) * 0.5 + 0.5;
        char.position.y = posA[1] + hop * t;

        return false; // This task never ends
    };
}
// #endregion

// #region POSTEFFECT
import UnrealBloomPass from 'postprocess/UnrealBloomPass.js';
import OutputPass      from 'postprocess/OutputPass.js';
function addEffects( tjs ){
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // tjs.composer.renderToScreen = false;
    tjs.renderer.toneMapping         = THREE.ReinhardToneMapping;
    tjs.renderer.toneMappingExposure = Math.pow( 1, 4.0 );
    
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    const res           = tjs.getRenderSize();
    const bloomPass     = new UnrealBloomPass( new THREE.Vector2( res[0], res[1] ) );
    bloomPass.threshold = 0;
    bloomPass.strength  = 0.5;
    bloomPass.radius    = 0.1;

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    const outputPass    = new OutputPass();

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    tjs.composer.addPass( bloomPass );
    tjs.composer.addPass( outputPass );
}
// #endregion