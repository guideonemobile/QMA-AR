//
//  QMAPoi.h
//  QMA-AR
//
//  Created by JB DeLima on 6/3/14.
//  Copyright (c) 2014 GuideOne. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>

@class QMATarget;

@interface QMAPoi : NSManagedObject

@property (nonatomic, retain) NSString * audio;
@property (nonatomic, retain) NSNumber * color;
@property (nonatomic, retain) NSString * image;
@property (nonatomic, retain) NSString * label;
@property (nonatomic, retain) NSString * personName;
@property (nonatomic, retain) QMATarget *target;

@end
