//
//  QMAGalleryItem.h
//  QMA-AR
//
//  Created by JB DeLima on 6/4/14.
//  Copyright (c) 2014 GuideOne. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>

@class QMAPoi;

@interface QMAGalleryItem : NSManagedObject

@property (nonatomic, retain) NSString * caption;
@property (nonatomic, retain) NSString * image;
@property (nonatomic, retain) QMAPoi *poi;

@end
