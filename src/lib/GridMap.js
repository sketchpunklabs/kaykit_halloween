import { InstancedMesh, Object3D, InstancedBufferAttribute } from 'three';

export default class GridMap{
    // #region MAIN
    dimension       = [ 10, 10 ];
    cellSize        = 4;
    tiles           = {};
    root            = null;
    offsetPos       = [-5,-5];
    instIncrease    = 10;

    constructor( dim, cSize, parent ){
        this.root           = parent;
        this.dimension[ 0 ] = dim[0];
        this.dimension[ 1 ] = dim[1];
        this.cellSize       = cSize;
    }
    // #endregion

    // #region GETTERS / SETTERS
    setOffset( x, y ){
        this.offsetPos[ 0 ] = x;
        this.offsetPos[ 1 ] = y;
        return this;
    }

    coordToPos( c, nOffset=[0,0] ){
        return [
            this.offsetPos[0] + c[0] * this.cellSize + nOffset[0] * this.cellSize,
            0,
            this.offsetPos[1] + c[1] * this.cellSize + nOffset[1] * this.cellSize,
        ];
    }
    // #endregion

    // #region TILES
    async loadLevel( url ){
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Get response
        const res = await fetch( url );
        if( !res.ok ){ console.error( res.status ); reject( res.status ); return; }

        const json = await res.json();
        if( !json ){ console.error( 'Unable to download json' ); reject( 'Unable to download json' ); return; }

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        for( const o of json ){
            for( const i of o.inst ){
                //--------------------------------
                // Single Placement
                if( i.coord ){
                    this.useTile( o.key, i.coord, i.noffset, i.rot, i.ypos );

                //--------------------------------
                // Range Placement
                }else if( i.coordRng ){
                    for( let x=i.coordRng[0]; x <= i.coordRng[2]; x++ ){
                        for( let y=i.coordRng[1]; y <= i.coordRng[3]; y++ ){
                            this.useTile( o.key, [x,y], i.noffset, i.rot, i.ypos );
                        }
                    }
                }
            }
        }
    }

    // Add mesh that will be instanced
    addTile( key, geo, mat, initialSize=5 ){
        const m = new InstancedMesh( geo, mat, initialSize );
        // m.instanceMatrix.setUsage( THREE.DynamicDrawUsage ); // will be updated every frame
        m.count         = 0;
        m.frustumCulled = false; // Bug where tiles disapear when zoomed in close enough, Dont think the bounding is correct for all instances

        this.tiles[ key ] = m;
        this.root.add( m );
    }

    // Create a new tile instance
    useTile( name, coord=[0,0], nOffset=[0,0], rot=[0,0,0], ypos=0 ){
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        if( !this.tiles[ name ] ){ console.log( 'Tile Not Found:', name ); return; }

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Resize Instance Buff if not enough room for tile
        const tile = this.tiles[ name ];

        if( tile.count >= tile.instanceMatrix.count ){
            console.log( 'Resize Instance for:', name );

            const cnt = tile.instanceMatrix.count + this.instIncrease;      // Increase by N Count
            const buf = new Float32Array( cnt * 16 );                       // Allocate new memory
            buf.set( tile.instanceMatrix.array );                           // Copy old data to new buffer

            tile.instanceMatrix = new InstancedBufferAttribute( buf, 16 );  // Replace with buffer buffer
        }

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Apply Transform to tile
        const idx = tile.count;
        const obj = new Object3D();
        obj.rotation.order = 'YXZ';

        // Placement
        if( coord ) obj.position.fromArray( this.coordToPos( coord, nOffset ) );
        if( ypos )  obj.position.y += ypos;

        // Rotation
        if( rot ){
            obj.rotation.x = rot[0] * Math.PI / 180;
            obj.rotation.y = rot[1] * Math.PI / 180;
            obj.rotation.z = rot[2] * Math.PI / 180;
        }

        // Object Management
        obj.updateMatrix();
        tile.setMatrixAt( idx, obj.matrix );
        tile.instanceMatrix.needsUpdate = true;
        tile.geometry.computeBoundingSphere();
        tile.count++;
    }
    // #endregion
}